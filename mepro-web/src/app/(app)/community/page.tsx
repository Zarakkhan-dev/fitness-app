'use client';

/**
 * Community: the shared feed. One list request per tab, likes patched
 * optimistically against both the query cache and the accumulated list, and
 * comment threads fetched only when a card opens them so browsing never pulls
 * every thread at once.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Comment, CommunityPost, Paged } from '@/lib/types';
import { formatEnumLabel, formatRelativeDay } from '@/lib/format';
import { communityApi } from '@/lib/endpoints';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';
import {
  Avatar,
  Button,
  Card,
  Chip,
  EnumPill,
  Field,
  Modal,
  Pill,
  SegmentedTabs,
  Select,
  TextArea,
} from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, Loading, SkeletonList } from '@/components/states';
import { FadeIn, PageBody, Stagger, StaggerItem } from '@/components/motion';
import {
  CommentIcon,
  FlagIcon,
  HeartIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  TrashIcon,
  UsersIcon,
} from '@/components/icons';

type Tab = 'all' | 'mine';

const PAGE_SIZE = 10;

const POST_TYPES = ['update', 'question', 'achievement', 'tip'] as const;

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'My posts' },
];

/** Sub-minute, sub-hour and sub-day labels; older stamps fall back to a day. */
function timeAgo(value?: string | null): string {
  if (!value) return '';
  const stamp = Date.parse(value);
  if (Number.isNaN(stamp)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - stamp) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatRelativeDay(value.slice(0, 10));
}

interface PanelState {
  loading: boolean;
  error: string | null;
  comments: Comment[];
  total: number;
}

const EMPTY_PANEL: PanelState = { loading: false, error: null, comments: [], total: 0 };

/* --------------------------------------------------------------- sections */

function PostCard({
  post,
  isOwn,
  likeBusy,
  panelOpen,
  panel,
  commentDraft,
  commentBusy,
  onLike,
  onToggleComments,
  onCommentChange,
  onSubmitComment,
  onDelete,
  onReport,
}: {
  post: CommunityPost;
  isOwn: boolean;
  likeBusy: boolean;
  panelOpen: boolean;
  panel: PanelState;
  commentDraft: string;
  commentBusy: boolean;
  onLike: (post: CommunityPost) => void;
  onToggleComments: (post: CommunityPost) => void;
  onCommentChange: (value: string) => void;
  onSubmitComment: (post: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
  onReport: (post: CommunityPost) => void;
}) {
  const liked = post.likedByMe ?? false;
  const likeCount = post.likeCount ?? post.likesCount ?? 0;
  const imageUrl = post.imageUrls?.[0];

  return (
    <Card className="p-4 sm:p-5">
      {/* -------------------------------------------------------- author */}
      <div className="flex items-start gap-3">
        <Avatar name={post.authorName} url={post.authorAvatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[14px] font-bold text-ink">{post.authorName}</span>
            <span className="text-[12.5px] text-mute">{timeAgo(post.createdAt)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <EnumPill value={post.postType} />
            {post.category && post.category !== 'general' ? (
              <Pill tone="neutral">{formatEnumLabel(post.category)}</Pill>
            ) : null}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- content */}
      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{post.content}</p>

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="mt-3 max-h-72 w-full rounded-xl border border-line object-cover"
        />
      ) : null}

      {/* ------------------------------------------------------- actions */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLike(post)}
          disabled={likeBusy}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike this post' : 'Like this post'}
        >
          <HeartIcon
            className={cn('h-4 w-4', liked && 'text-danger')}
            fill={liked ? 'currentColor' : 'none'}
          />
          {likeCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleComments(post)}
          aria-expanded={panelOpen}
        >
          <CommentIcon className="h-4 w-4" />
          {post.commentCount ?? 0}
        </Button>
        <span className="ml-auto">
          {isOwn ? (
            <Button variant="ghost" size="sm" onClick={() => onDelete(post)}>
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onReport(post)}>
              <FlagIcon className="h-4 w-4" />
              Report
            </Button>
          )}
        </span>
      </div>

      {/* ------------------------------------------------------- comments */}
      {panelOpen ? (
        <div className="mt-3 rounded-xl border border-line bg-alt/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12.5px] font-bold tracking-wide text-mute uppercase">Comments</p>
            <span className="text-[12.5px] tabular-nums text-mute">{panel.total}</span>
          </div>

          {panel.loading ? (
            <Loading label="Loading comments…" className="py-6" />
          ) : panel.error ? (
            <div className="mt-2.5">
              <InlineNotice tone="error" message={panel.error} />
            </div>
          ) : panel.comments.length === 0 ? (
            <p className="mt-2.5 text-[13px] text-mute">
              No comments yet — say something encouraging.
            </p>
          ) : (
            <ul className="mt-2.5 space-y-2.5">
              {panel.comments.map((comment) => (
                <li key={comment._id} className="flex items-start gap-2.5">
                  <Avatar name={comment.userName} size={26} />
                  <div className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-ink">{comment.userName}</span>
                      <span className="text-[11.5px] text-mute">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-sub">
                      {comment.content}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitComment(post);
            }}
          >
            <Field
              className="min-w-0 flex-1"
              aria-label="Add a comment"
              placeholder="Add a comment"
              value={commentDraft}
              onChange={(event) => onCommentChange(event.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              loading={commentBusy}
              disabled={commentDraft.trim().length === 0}
              icon={<SendIcon className="h-4 w-4" />}
            >
              Send
            </Button>
          </form>
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------- page */

export default function CommunityPage() {
  usePageTitle('Community');
  const toast = useToast();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<string>(POST_TYPES[0]);
  const [category, setCategory] = useState('general');
  const [posting, setPosting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  const [items, setItems] = useState<CommunityPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreBaseData = useRef<Paged<CommunityPost> | null>(null);
  const loadMoreBaseError = useRef<ApiError | null>(null);
  const loadMoreTarget = useRef(1);

  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});

  const [panelId, setPanelId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>(EMPTY_PANEL);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const panelReq = useRef(0);

  const [deleteTarget, setDeleteTarget] = useState<CommunityPost | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [reportTarget, setReportTarget] = useState<CommunityPost | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const { data, error, isLoading, isRefreshing, refetch, setData } = useApiQuery<
    Paged<CommunityPost>
  >(
    () =>
      tab === 'all'
        ? communityApi.list({
            page,
            limit: PAGE_SIZE,
            sort: 'recent',
            search: search || undefined,
          })
        : communityApi.mine({ page, limit: PAGE_SIZE }),
    [tab, page, search],
  );

  /* --------------------------------------------------- feed list seeding */
  // Page 1 responses replace the list (tab, search and reset points); deeper
  // pages append, deduped by id so a background refetch cannot double a row.
  // Responses carrying a page number other than the one the list is currently
  // showing are stale (a tab/search switch raced an older request) and ignored.
  // Adjusted during render via the documented prev-comparison pattern rather
  // than an effect, so a fresh page never costs an extra committed render.
  const [appliedData, setAppliedData] = useState<Paged<CommunityPost> | null>(null);
  if (data !== appliedData) {
    setAppliedData(data);
    const dataPage = data?.page ?? data?.meta?.page;
    if (data && (dataPage === undefined || dataPage === page)) {
      const incoming = data.items ?? [];
      if (page <= 1) {
        setItems(incoming);
      } else {
        setItems((current) => {
          const seen = new Set(current.map((post) => post._id));
          const extra = incoming.filter((post) => !seen.has(post._id));
          return extra.length > 0 ? [...current, ...extra] : current;
        });
      }
    }
  }

  /* ------------------------------------------------- load more settlement */
  // The hook owns the request, so success/failure is detected by comparing
  // against the snapshot taken when "Load more" was pressed. An optimistic
  // like patch also replaces `data`, so success additionally requires the
  // response to carry the page that was requested.
  useEffect(() => {
    if (!loadingMore) return;
    if (data && data !== loadMoreBaseData.current) {
      const dataPage = data.page ?? data.meta?.page;
      if (dataPage === undefined || dataPage >= loadMoreTarget.current) {
        setLoadingMore(false);
        return;
      }
    }
    if (error && error !== loadMoreBaseError.current) {
      setLoadingMore(false);
      // Target was always `page + 1`, so this lands on the last loaded page.
      setPage((current) => Math.max(1, current - 1));
      toast.error(error.message, 'Could not load more posts.');
    }
  }, [loadingMore, data, error, toast]);

  function patchFeed(fn: (post: CommunityPost) => CommunityPost) {
    setItems((current) => current.map(fn));
    setData((current) => (current ? { ...current, items: current.items.map(fn) } : current));
  }

  function changeTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    setPage(1);
    closeComments();
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const next = searchInput.trim();
    const unchanged = next === search && page === 1;
    setPage(1);
    setSearch(next);
    if (unchanged) refetch();
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  /* ------------------------------------------------------------ composer */
  async function submitPost(event: FormEvent) {
    event.preventDefault();
    const text = content.trim();
    if (!text || posting) return;
    setPosting(true);
    setComposerError(null);
    setContentError(null);
    try {
      await communityApi.create({
        content: text,
        postType,
        category: category.trim() || 'general',
      });
      toast.success('Posted');
      setContent('');
      setPostType(POST_TYPES[0]);
      setCategory('general');
      setPage(1);
      refetch();
    } catch (cause) {
      if (cause instanceof ApiError) {
        const fieldErrors = cause.fieldErrors;
        setContentError(fieldErrors.content ?? null);
        if (Object.keys(fieldErrors).length === 0) setComposerError(cause.message);
      } else {
        setComposerError('Could not publish your post.');
      }
    } finally {
      setPosting(false);
    }
  }

  /* ---------------------------------------------------------------- likes */
  async function toggleLike(post: CommunityPost) {
    if (likeBusy[post._id]) return;
    const wasLiked = post.likedByMe ?? false;
    const optimisticCount = Math.max(
      0,
      (post.likeCount ?? post.likesCount ?? 0) + (wasLiked ? -1 : 1),
    );
    setLikeBusy((current) => ({ ...current, [post._id]: true }));
    patchFeed((candidate) =>
      candidate._id === post._id
        ? {
            ...candidate,
            likedByMe: !wasLiked,
            likeCount: optimisticCount,
            likesCount: optimisticCount,
          }
        : candidate,
    );
    try {
      const result = await communityApi.toggleLike(post._id);
      patchFeed((candidate) =>
        candidate._id === post._id
          ? {
              ...candidate,
              likedByMe: result.liked,
              likeCount: result.likeCount,
              likesCount: result.likeCount,
            }
          : candidate,
      );
    } catch (cause) {
      patchFeed((candidate) => (candidate._id === post._id ? post : candidate));
      toast.error(cause instanceof ApiError ? cause.message : 'Could not update that like.');
    } finally {
      setLikeBusy((current) => {
        const next = { ...current };
        delete next[post._id];
        return next;
      });
    }
  }

  /* ------------------------------------------------------------- comments */
  function closeComments() {
    panelReq.current += 1;
    setPanelId(null);
    setPanel(EMPTY_PANEL);
    setCommentDraft('');
    setCommentBusy(false);
  }

  async function toggleComments(post: CommunityPost) {
    if (panelId === post._id) {
      closeComments();
      return;
    }
    const request = ++panelReq.current;
    setPanelId(post._id);
    setCommentDraft('');
    setPanel({ loading: true, error: null, comments: [], total: post.commentCount ?? 0 });
    try {
      const result = await communityApi.comments(post._id);
      if (panelReq.current !== request) return;
      setPanel({
        loading: false,
        error: null,
        comments: result.comments ?? [],
        total: result.total ?? result.comments?.length ?? 0,
      });
    } catch (cause) {
      if (panelReq.current !== request) return;
      setPanel({
        loading: false,
        error: cause instanceof ApiError ? cause.message : 'Could not load comments.',
        comments: [],
        total: post.commentCount ?? 0,
      });
    }
  }

  async function submitComment(post: CommunityPost) {
    const text = commentDraft.trim();
    const request = panelReq.current;
    if (!text || commentBusy || panelId !== post._id) return;
    setCommentBusy(true);
    try {
      await communityApi.addComment(post._id, text);
      if (panelReq.current !== request) return;
      setCommentDraft('');
      patchFeed((candidate) =>
        candidate._id === post._id
          ? { ...candidate, commentCount: (candidate.commentCount ?? 0) + 1 }
          : candidate,
      );
      const result = await communityApi.comments(post._id);
      if (panelReq.current !== request) return;
      setPanel({
        loading: false,
        error: null,
        comments: result.comments ?? [],
        total: result.total ?? result.comments?.length ?? 0,
      });
      toast.success('Comment posted');
    } catch (cause) {
      if (panelReq.current !== request) return;
      toast.error(cause instanceof ApiError ? cause.message : 'Could not post that comment.');
    } finally {
      if (panelReq.current === request) setCommentBusy(false);
    }
  }

  /* ------------------------------------------------------------ delete */
  async function confirmDelete() {
    if (!deleteTarget || deleteBusy) return;
    const target = deleteTarget;
    setDeleteBusy(true);
    try {
      await communityApi.remove(target._id);
      const remove = (post: CommunityPost) => post._id !== target._id;
      setItems((current) => current.filter(remove));
      setData((current) =>
        current ? { ...current, items: current.items.filter(remove) } : current,
      );
      if (panelId === target._id) closeComments();
      toast.success('Post deleted');
      refetch();
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not delete that post.');
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  }

  /* ------------------------------------------------------------- report */
  function openReport(post: CommunityPost) {
    setReportTarget(post);
    setReportReason('');
    setReportNotice(null);
  }

  async function submitReport() {
    const reason = reportReason.trim();
    if (!reportTarget || reason.length < 3 || reportBusy) return;
    setReportBusy(true);
    setReportNotice(null);
    try {
      await communityApi.report(reportTarget._id, reason);
      toast.success('Thanks for the report');
      setReportTarget(null);
      setReportReason('');
    } catch (cause) {
      // Conflicts ("already reported") and validation misses both land here so
      // the reason box keeps its input and explains what happened.
      setReportNotice(cause instanceof ApiError ? cause.message : 'Could not send the report.');
    } finally {
      setReportBusy(false);
    }
  }

  /* ---------------------------------------------------------- load more */
  function loadMore() {
    if (loadingMore) return;
    loadMoreBaseData.current = data;
    loadMoreBaseError.current = error;
    loadMoreTarget.current = page + 1;
    setLoadingMore(true);
    setPage((current) => current + 1);
  }

  const totalPages = data?.meta?.totalPages ?? data?.totalPages ?? 1;
  const canLoadMore = totalPages > page;

  return (
    <PageBody className="space-y-5">
      {/* ---------------------------------------------------------- header */}
      <FadeIn className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-mute">
            Share wins, ask questions, cheer each other on
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
            Community
          </h1>
        </div>
        <SegmentedTabs<Tab> value={tab} onChange={changeTab} options={TAB_OPTIONS} />
      </FadeIn>

      {/* -------------------------------------------------------- composer */}
      <FadeIn delay={0.04}>
        <Card className="p-4 sm:p-5">
          <form className="space-y-3" onSubmit={submitPost}>
            <div className="flex items-start gap-3">
              <Avatar name={user?.name} url={user?.avatarUrl} size={40} />
              <TextArea
                className="min-w-0 flex-1"
                aria-label="Post content"
                placeholder="What did you train today?"
                rows={3}
                maxLength={2000}
                value={content}
                error={contentError}
                onChange={(event) => {
                  setContent(event.target.value);
                  if (contentError) setContentError(null);
                }}
              />
            </div>

            {composerError ? <InlineNotice tone="error" message={composerError} /> : null}

            <div className="flex flex-wrap items-end gap-3">
              <Select
                label="Post type"
                className="w-44"
                value={postType}
                onChange={(event) => setPostType(event.target.value)}
              >
                {POST_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {formatEnumLabel(value)}
                  </option>
                ))}
              </Select>
              <Field
                label="Category"
                className="w-40"
                placeholder="general"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
              <Button
                type="submit"
                className="ml-auto"
                loading={posting}
                disabled={content.trim().length === 0}
              >
                <PlusIcon className="h-4 w-4" />
                Post
              </Button>
            </div>
          </form>
        </Card>
      </FadeIn>

      {/* ---------------------------------------------------------- search */}
      <FadeIn delay={0.06} className="flex flex-wrap items-end gap-2">
        <form className="flex min-w-0 flex-1 items-end gap-2 sm:max-w-md" onSubmit={submitSearch}>
          <Field
            className="min-w-0 flex-1"
            aria-label="Search posts"
            placeholder="Search posts"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" variant="secondary" icon={<SearchIcon className="h-4 w-4" />}>
            Search
          </Button>
        </form>
        {search ? (
          <Chip onClick={clearSearch}>
            Clear “{search}”
          </Chip>
        ) : null}
        <span className="ml-auto text-[12.5px] text-mute">
          {data ? `${data.total ?? data.meta?.total ?? items.length} posts` : ''}
        </span>
      </FadeIn>

      {/* ------------------------------------------------------------ feed */}
      {error && items.length > 0 ? (
        <FadeIn>
          <InlineNotice tone="error" message={error.message} />
        </FadeIn>
      ) : null}

      {items.length === 0 && error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 && isLoading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <FadeIn delay={0.08}>
          <EmptyState
            title={tab === 'all' ? 'No posts yet' : "You haven't posted yet"}
            message={
              tab === 'all'
                ? search
                  ? `Nothing matches “${search}” — try a different word.`
                  : 'Be the first to share a win, ask a question or drop a tip.'
                : 'Share what you trained today and it will show up here.'
            }
            icon={<UsersIcon className="h-5 w-5" />}
          />
        </FadeIn>
      ) : (
        <>
          <Stagger className="space-y-4">
            {items.map((post) => (
              <StaggerItem key={post._id}>
                <PostCard
                  post={post}
                  isOwn={post.userId === user?._id}
                  likeBusy={likeBusy[post._id] ?? false}
                  panelOpen={panelId === post._id}
                  panel={panel}
                  commentDraft={commentDraft}
                  commentBusy={commentBusy}
                  onLike={(target) => void toggleLike(target)}
                  onToggleComments={(target) => void toggleComments(target)}
                  onCommentChange={setCommentDraft}
                  onSubmitComment={(target) => void submitComment(target)}
                  onDelete={setDeleteTarget}
                  onReport={openReport}
                />
              </StaggerItem>
            ))}
          </Stagger>

          {canLoadMore ? (
            <FadeIn delay={0.05} className="flex justify-center pb-2">
              <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                Load more
              </Button>
            </FadeIn>
          ) : null}
        </>
      )}

      {/* ---------------------------------------------------- delete modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this post?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deleteBusy}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-sub">
          {deleteTarget ? `“${deleteTarget.content.slice(0, 120)}”` : ''} and its comments will be
          removed. This cannot be undone.
        </p>
      </Modal>

      {/* ---------------------------------------------------- report modal */}
      <Modal
        open={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        title="Report this post?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportTarget(null)} disabled={reportBusy}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitReport()}
              loading={reportBusy}
              disabled={reportReason.trim().length < 3}
            >
              <FlagIcon className="h-4 w-4" />
              Report
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {reportNotice ? <InlineNotice tone="error" message={reportNotice} /> : null}
          <p className="text-[13.5px] leading-relaxed text-sub">
            Tell the moderators why this post should be reviewed. Reports are anonymous to the
            author.
          </p>
          <TextArea
            label="Reason"
            placeholder="Why should this be reviewed?"
            rows={3}
            maxLength={500}
            autoFocus
            value={reportReason}
            error={
              reportReason.length > 0 && reportReason.trim().length < 3
                ? 'Use at least 3 characters.'
                : null
            }
            onChange={(event) => {
              setReportReason(event.target.value);
              if (reportNotice) setReportNotice(null);
            }}
          />
        </div>
      </Modal>

      {isRefreshing ? (
        <span className="sr-only" aria-live="polite">
          Refreshing
        </span>
      ) : null}
    </PageBody>
  );
}
