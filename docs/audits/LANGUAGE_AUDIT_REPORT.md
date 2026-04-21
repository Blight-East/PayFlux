# Language Audit Report - Signal Registry

## Objective
Audit customer-facing signal registry for predictive language that implies future outcomes rather than present detection.

## Problem Pattern
Language suggesting prediction rather than detection creates:
- Legal exposure
- Compliance positioning risk
- Pricing credibility issues

## Findings

### Instances Found: 2

#### 1. Backpressure Alert Signal (Line 220)
**Original**: "Early warning of system overload requiring intervention"  
**Fixed**: "Real-time detection of system overload that may precede service degradation"  
**Rationale**: Changed from predictive "early warning" to factual "real-time detection"

#### 2. Elevated Risk Band Signal (Line 338)
**Original**: "Increased monitoring, potential manual review, early warning signal"  
**Fixed**: "Increased monitoring, potential manual review, real-time detection that may precede processor escalation"  
**Rationale**: Changed from predictive "early warning signal" to factual "real-time detection that may precede"

## Additional Audit Results

### Acceptable Usage of "may indicate"
Found 3 instances of "may indicate" - these are acceptable because they describe possible interpretations of detected signals, not predictions:
- Line 76: "Traffic spikes may indicate legitimate growth, campaigns, or abuse"
- Line 92: "Geo entropy changes may indicate expansion, credential sharing, or fraud"
- Line 152: "Revoked keys may indicate compromised credentials or unauthorized access attempts"

**Verdict**: ✅ ACCEPTABLE - "may indicate" describes signal interpretation, not future prediction

### No Predictive Language Found
- ✅ No instances of "will"
- ✅ No instances of "predict"
- ✅ No instances of "forecast"
- ✅ No instances of "anticipate"

## Compliance Status

✅ **APPROVED FOR EXTERNAL USE**

All predictive language has been replaced with detection-based phrasing. The registry now:
- Describes what signals detect (present tense)
- Uses "may indicate" for interpretation (acceptable)
- Uses "may precede" for temporal relationships (factual, not predictive)
- Avoids implying future outcome prediction

## Legal Protection

The revised language protects against:
1. **Legal exposure**: No claims of predicting future events
2. **Compliance positioning**: Clear distinction between detection and prediction
3. **Pricing credibility**: Accurate representation of detection capabilities
