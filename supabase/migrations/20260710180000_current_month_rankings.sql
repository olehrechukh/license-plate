-- Keep the leaderboard aligned with the "this month" copy in the UI.
-- Each current-month report starts at -1; agreement worsens the score and disagreement offsets it.
drop view if exists public.plate_rankings;

create view public.plate_rankings as
  with current_comments as (
    select c.plate,
           c.id,
           (-1 - vc.ups + vc.downs)::int as score
    from public.comments c
    join public.comment_vote_counts vc on vc.id = c.id
    where c.created_at >= date_trunc('month', now())
      and c.created_at < date_trunc('month', now()) + interval '1 month'
  )
  select p.plate,
         p.province,
         coalesce(sum(cc.score), 0)::int as score,
         count(cc.id)::int as comment_count
  from public.plates p
  left join current_comments cc on cc.plate = p.plate
  group by p.plate, p.province;
