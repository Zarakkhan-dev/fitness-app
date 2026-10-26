'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import type { YogaRoutine } from '@/lib/types';
import { formatEnumLabel, formatMinutes } from '@/lib/format';
import { useApiQuery } from '@/hooks/use-api-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { yogaApi } from '@/lib/endpoints';
import { isLocalId, useCustomCatalog } from '@/lib/custom-catalog';
import {
  Button,
  Card,
  Pill,
} from '@/components/ui';
import { EmptyState, ErrorState, InlineNotice, SkeletonList } from '@/components/states';
import { FadeIn, Stagger, StaggerItem } from '@/components/motion';
import { CheckIcon, ChevronLeftIcon, PlayIcon } from '@/components/icons';

export default function YogaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const catalog = useCustomCatalog();
  // A `local-` id is answered from the device, so a routine the user wrote
  // opens even when the API is unreachable.
  const localRoutine = isLocalId(id)
    ? catalog.yoga.find((entry) => entry._id === id)
    : undefined;

  const yogaQuery = useApiQuery<YogaRoutine>(
    () => yogaApi.detail(id),
    [id],
    { enabled: !!id && !isLocalId(id) },
  );

  const yoga = isLocalId(id) ? localRoutine ?? null : yogaQuery.data;
  usePageTitle(yoga?.title || 'Yoga');

  const isLoading = !isLocalId(id) && yogaQuery.isLoading && !yogaQuery.data;
  const error = !isLocalId(id) && yogaQuery.error && !yogaQuery.data ? yogaQuery.error : null;

  if (isLoading) {
    return <SkeletonList rows={4} />;
  }

  if (error && !yoga) {
    return <ErrorState error={error} onRetry={yogaQuery.refetch} />;
  }

  if (!yoga) {
    return (
      <EmptyState
        title="Yoga sequence not found"
        message="This sequence may have been removed."
        action={
          <Link href="/train">
            <Button variant="secondary" size="sm">
              Back to train
            </Button>
          </Link>
        }
      />
    );
  }

  const poses = yoga.asanas ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <FadeIn>
        <Link href="/train" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <ChevronLeftIcon className="h-4 w-4" />
          Back to train
        </Link>
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
                {yoga.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {isLocalId(yoga._id) && <Pill tone="brand">Mine</Pill>}
                {(yoga.level || yoga.difficulty) && (
                  <Pill tone="neutral">
                    {formatEnumLabel(yoga.level || yoga.difficulty)}
                  </Pill>
                )}
                <Pill tone="neutral">{formatMinutes(yoga.durationMinutes)}</Pill>
                <Pill tone="neutral">
                  {poses.length} pose{poses.length === 1 ? '' : 's'}
                </Pill>
              </div>
              {yoga.focusAreas && yoga.focusAreas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {yoga.focusAreas.map((focus) => (
                    <Pill key={focus} tone="neutral" className="!px-2 !py-0.5">
                      {formatEnumLabel(focus)}
                    </Pill>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => router.push(`/train/session?yogaId=${yoga._id}`)}
            >
              <PlayIcon className="h-4 w-4" />
              Start sequence
            </Button>
          </div>
        </Card>
      </FadeIn>

      {/* Description */}
      {yoga.description && (
        <FadeIn delay={0.05}>
          <Card className="p-5">
            <h3 className="mb-2 text-[14px] font-bold text-ink">Description</h3>
            <p className="text-[13.5px] leading-relaxed text-sub whitespace-pre-line">
              {yoga.description}
            </p>
          </Card>
        </FadeIn>
      )}

      {/* Benefits */}
      {yoga.benefits && yoga.benefits.length > 0 && (
        <FadeIn delay={0.08}>
          <Card className="p-5">
            <h3 className="mb-3 text-[14px] font-bold text-ink">Benefits</h3>
            <ul className="space-y-2">
              {yoga.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-success" />
                  <span className="text-[13.5px] text-sub">{benefit}</span>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>
      )}

      {/* Precautions */}
      {yoga.precautions && yoga.precautions.length > 0 && (
        <FadeIn delay={0.1}>
          <InlineNotice
            tone="warning"
            message={
              <ul className="space-y-1">
                {yoga.precautions.map((prec, idx) => (
                  <li key={idx}>• {prec}</li>
                ))}
              </ul>
            }
          />
        </FadeIn>
      )}

      {/* Poses */}
      <FadeIn delay={0.12}>
        <Card className="p-5">
          <h3 className="mb-3 text-[14px] font-bold text-ink">Poses</h3>
          <Stagger className="space-y-2.5">
            {poses
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((pose, idx) => (
                <StaggerItem key={`${pose.order}-${pose.name}`}>
                  <div className="flex items-start gap-3 rounded-xl bg-alt/70 px-3 py-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-[12.5px] font-bold text-sub">
                      {(pose.order ?? idx + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">
                        {pose.name}
                        {pose.sanskritName && (
                          <span className="ml-2 text-[12.5px] italic text-mute">
                            ({pose.sanskritName})
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-sub">
                        {pose.holdSeconds
                          ? `${Math.round(pose.holdSeconds / 60 * 10) / 10} min`
                          : ''}
                        {pose.benefits && pose.benefits.length > 0 && (
                          <span className="ml-2 text-mute">
                            • {pose.benefits.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </p>
                      {pose.description && (
                        <p className="mt-1 text-[12.5px] text-mute line-clamp-3">
                          {pose.description}
                        </p>
                      )}
                    </div>
                  </div>
                </StaggerItem>
              ))}
          </Stagger>
        </Card>
      </FadeIn>
    </div>
  );
}