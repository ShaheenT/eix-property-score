-- Atomic persistence boundary for the EiXPropScore™ Intelligence OS.
-- The server sends one JSON payload; PostgreSQL commits the complete run,
-- signals, evidence and risks together or rolls the entire operation back.

create or replace function public.persist_property_intelligence_report(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_signal jsonb;
  v_evidence jsonb;
  v_signal_id uuid;
  v_submission_id uuid;
  v_extraction_run_id uuid;
  v_status text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Intelligence persistence payload must be a JSON object.' using errcode = '22023';
  end if;

  v_submission_id := nullif(p_payload->>'submissionId', '')::uuid;
  if v_submission_id is null then
    raise exception 'submissionId is required for intelligence persistence.' using errcode = '22023';
  end if;

  v_extraction_run_id := nullif(p_payload->>'extractionRunId', '')::uuid;
  v_status := coalesce(nullif(p_payload->>'status', ''), 'completed');

  if v_status not in ('queued', 'processing', 'completed', 'partial', 'failed') then
    raise exception 'Invalid intelligence run status: %', v_status using errcode = '22023';
  end if;

  insert into public.property_intelligence_runs (
    submission_id,
    extraction_run_id,
    engine_version,
    trust_index,
    status,
    generated_at
  ) values (
    v_submission_id,
    v_extraction_run_id,
    p_payload->>'engineVersion',
    greatest(0, least(100, coalesce((p_payload->>'trustIndex')::integer, 0)))::smallint,
    v_status,
    coalesce((p_payload->>'generatedAt')::timestamptz, now())
  )
  returning id into v_run_id;

  for v_signal in select value from jsonb_array_elements(coalesce(p_payload->'signals', '[]'::jsonb)) loop
    insert into public.property_intelligence_signals (
      run_id,
      engine,
      signal_key,
      label,
      value_json,
      status,
      confidence
    ) values (
      v_run_id,
      coalesce(nullif(split_part(v_signal->>'key', '.', 1), ''), 'intelligence'),
      v_signal->>'key',
      v_signal->>'label',
      v_signal->'value',
      v_signal->>'status',
      greatest(0, least(100, coalesce((v_signal->>'confidence')::integer, 0)))::smallint
    )
    returning id into v_signal_id;

    for v_evidence in select value from jsonb_array_elements(coalesce(v_signal->'evidence', '[]'::jsonb)) loop
      insert into public.property_intelligence_evidence (
        signal_id,
        evidence_key,
        claim,
        evidence_type,
        source,
        source_url,
        confidence,
        retrieved_at,
        notes
      ) values (
        v_signal_id,
        v_evidence->>'id',
        v_evidence->>'claim',
        v_evidence->>'evidenceType',
        v_evidence->>'source',
        nullif(v_evidence->>'sourceUrl', ''),
        greatest(0, least(100, coalesce((v_evidence->>'confidence')::integer, 0)))::smallint,
        coalesce((v_evidence->>'retrievedAt')::timestamptz, now()),
        nullif(v_evidence->>'notes', '')
      );
    end loop;
  end loop;

  for v_signal in select value from jsonb_array_elements(coalesce(p_payload->'riskSignals', '[]'::jsonb)) loop
    insert into public.property_risk_signals (
      run_id,
      risk_key,
      severity,
      title,
      description,
      evidence_json
    ) values (
      v_run_id,
      v_signal->>'key',
      v_signal->>'severity',
      v_signal->>'title',
      v_signal->>'description',
      coalesce(v_signal->'evidence', '[]'::jsonb)
    );
  end loop;

  return v_run_id;
end;
$$;

revoke all on function public.persist_property_intelligence_report(jsonb) from public, anon, authenticated;
grant execute on function public.persist_property_intelligence_report(jsonb) to service_role;
