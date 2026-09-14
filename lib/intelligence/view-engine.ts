import { calculatedSignal, unknownSignal } from './evidence';
import type { IntelligenceContext, ViewIntelligence } from './types';

export interface ViewInputs {
  oceanView?: boolean | null;
  mountainView?: boolean | null;
  cityView?: boolean | null;
  confidence?: number | null;
}

export function buildViewIntelligence(_context: IntelligenceContext, input: ViewInputs = {}): ViewIntelligence {
  return {
    oceanView: input.oceanView == null
      ? unknownSignal('view.ocean', 'Ocean view', 'Ocean-view status requires listing evidence and/or geospatial verification.')
      : calculatedSignal('view.ocean', 'Ocean view', input.oceanView, input.confidence ?? 70, 'Ocean-view classification supplied by an evidence-backed view adapter.'),
    mountainView: input.mountainView == null
      ? unknownSignal('view.mountain', 'Mountain view', 'Mountain-view status requires listing evidence and/or geospatial verification.')
      : calculatedSignal('view.mountain', 'Mountain view', input.mountainView, input.confidence ?? 70, 'Mountain-view classification supplied by an evidence-backed view adapter.'),
    cityView: input.cityView == null
      ? unknownSignal('view.city', 'City view', 'City-view status requires listing evidence and/or geospatial verification.')
      : calculatedSignal('view.city', 'City view', input.cityView, input.confidence ?? 70, 'City-view classification supplied by an evidence-backed view adapter.'),
    viewConfidence: input.confidence == null
      ? unknownSignal('view.confidence', 'View confidence', 'View confidence cannot be calculated without view evidence.')
      : calculatedSignal('view.confidence', 'View confidence', input.confidence, input.confidence, 'Confidence supplied by the view classification engine.'),
  };
}
