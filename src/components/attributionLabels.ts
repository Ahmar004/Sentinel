import { RISK_FEATURE, type RiskFeature } from '@/domain/constants'

/** Human-readable labels for the nine risk features (srs.md Appendix A),
 * keyed by the imported constant so a component never hardcodes the
 * feature id string itself. */
export const RISK_FEATURE_LABEL: Record<RiskFeature, string> = {
  [RISK_FEATURE.density]: 'Density',
  [RISK_FEATURE.densityGradient]: 'Density gradient',
  [RISK_FEATURE.densityRateOfChange]: 'Density rate of change',
  [RISK_FEATURE.flowConvergence]: 'Flow convergence',
  [RISK_FEATURE.counterFlow]: 'Counter-flow',
  [RISK_FEATURE.speedMean]: 'Mean speed',
  [RISK_FEATURE.speedVariance]: 'Speed variance',
  [RISK_FEATURE.stopStartPulses]: 'Stop-start pulses',
  [RISK_FEATURE.exitOccupancy]: 'Exit occupancy',
}
