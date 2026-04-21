package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"payment-node/internal/tiers"
)

type Signal struct {
	ID             string   `json:"id"`
	Type           string   `json:"type"`
	Deterministic  bool     `json:"deterministic"`
	SeverityLevels []string `json:"severity_levels"`
}

type Registry struct {
	Signals []Signal `json:"signals"`
}

type SignalTierMapping struct {
	SignalID            string   `json:"signal_id"`
	Name                string   `json:"name"`
	Category            string   `json:"category"`
	Deterministic       bool     `json:"deterministic"`
	AllowedTiers        []string `json:"allowed_tiers"`
	HighestRequiredTier string   `json:"highest_required_tier"`
	RestrictedReason    string   `json:"restricted_reason,omitempty"`
}

type TierSummary struct {
	Tier                string   `json:"tier"`
	SignalCount         int      `json:"signal_count"`
	Categories          []string `json:"categories"`
	CategoriesExcluded  []string `json:"categories_excluded"`
	MaxRiskLevel        string   `json:"max_risk_level"`
	TelemetryVisibility string   `json:"telemetry_visibility"`
	EvidenceCapability  string   `json:"evidence_capability"`
	PositioningLabel    string   `json:"positioning_label"`
}

type PricingDataset struct {
	Baseline PricingTier `json:"baseline"`
	Proof    PricingTier `json:"proof"`
	Shield   PricingTier `json:"shield"`
	Fortress PricingTier `json:"fortress"`
}

type PricingTier struct {
	SignalCount            int    `json:"signal_count"`
	ValueDensity           string `json:"value_density"`
	RecommendedPriceAnchor string `json:"recommended_price_anchor"`
}

func main() {
	// Load signal registry
	registryData, err := os.ReadFile("internal/specs/signal-registry.v1.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "FIELD_UNRESOLVABLE:signal_registry\n")
		os.Exit(1)
	}

	var registry Registry
	if err := json.Unmarshal(registryData, &registry); err != nil {
		fmt.Fprintf(os.Stderr, "FIELD_UNRESOLVABLE:signal_registry_parse\n")
		os.Exit(1)
	}

	// Load tier registry
	tierRegistry, err := tiers.LoadTierRegistry("config/tiers.runtime.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "FIELD_UNRESOLVABLE:tier_config\n")
		os.Exit(1)
	}

	// Validate tier config
	if err := tiers.ValidateTierConfig("config/tiers.runtime.json", "internal/specs/signal-registry.v1.json"); err != nil {
		fmt.Fprintf(os.Stderr, "REGISTRY_VALIDATION: FAIL - %v\n", err)
		os.Exit(1)
	}

	fmt.Println("REGISTRY_VALIDATION: PASS")
	fmt.Println()

	// Build signal-to-tier mappings
	allTiers := []tiers.Tier{tiers.TierBaseline, tiers.TierProof, tiers.TierShield, tiers.TierFortress}
	mappings := make([]SignalTierMapping, 0, len(registry.Signals))

	for _, sig := range registry.Signals {
		mapping := SignalTierMapping{
			SignalID:      sig.ID,
			Name:          humanizeName(sig.ID),
			Category:      sig.Type,
			Deterministic: sig.Deterministic,
			AllowedTiers:  []string{},
		}

		// Check each tier
		for _, tier := range allTiers {
			allowed, reason := tierRegistry.ResolveSignalAccess(sig.ID, tier)
			if allowed {
				mapping.AllowedTiers = append(mapping.AllowedTiers, string(tier))
			} else if tier == tiers.TierBaseline {
				mapping.RestrictedReason = reason
			}
		}

		// Determine highest required tier
		if len(mapping.AllowedTiers) == 0 {
			mapping.HighestRequiredTier = "none"
		} else {
			mapping.HighestRequiredTier = mapping.AllowedTiers[0]
		}

		mappings = append(mappings, mapping)
	}

	// Sort by category, then ID
	sort.Slice(mappings, func(i, j int) bool {
		if mappings[i].Category != mappings[j].Category {
			return mappings[i].Category < mappings[j].Category
		}
		return mappings[i].SignalID < mappings[j].SignalID
	})

	// Build tier summaries
	summaries := buildTierSummaries(mappings, allTiers)

	// Output tier summary table
	fmt.Println("# TIER SUMMARY TABLE")
	fmt.Println()
	fmt.Printf("| %-10s | %-13s | %-40s | %-15s | %-25s | %-50s |\n",
		"Tier", "Signal Count", "Categories", "Max Risk Level", "Evidence Capability", "Positioning Label")
	fmt.Println("|------------|---------------|------------------------------------------|-----------------|---------------------------|--------------------------------------------------|")

	for _, summary := range summaries {
		fmt.Printf("| %-10s | %-13d | %-40s | %-15s | %-25s | %-50s |\n",
			summary.Tier,
			summary.SignalCount,
			strings.Join(summary.Categories, ", "),
			summary.MaxRiskLevel,
			summary.EvidenceCapability,
			summary.PositioningLabel)
	}
	fmt.Println()

	// Output signal-to-tier matrix
	fmt.Println("# SIGNAL → TIER MATRIX")
	fmt.Println()
	jsonOut, _ := json.MarshalIndent(mappings, "", "  ")
	fmt.Println(string(jsonOut))
	fmt.Println()

	// Output tier value explanations
	fmt.Println("# TIER VALUE EXPLANATIONS")
	fmt.Println()
	outputTierExplanations(summaries)

	// Output differential value analysis
	fmt.Println("# DIFFERENTIAL VALUE ANALYSIS")
	fmt.Println()
	outputDifferentialAnalysis(mappings, allTiers)

	// Output pricing dataset
	fmt.Println("# PRICING JUSTIFICATION DATASET")
	fmt.Println()
	pricingData := buildPricingDataset(summaries)
	pricingJSON, _ := json.MarshalIndent(pricingData, "", "  ")
	fmt.Println(string(pricingJSON))
}

func humanizeName(signalID string) string {
	// Extract human-readable name from signal ID
	parts := strings.Split(signalID, "_")
	if len(parts) < 3 {
		return signalID
	}
	name := strings.Join(parts[2:], " ")
	return strings.Title(name)
}

func buildTierSummaries(mappings []SignalTierMapping, allTiers []tiers.Tier) []TierSummary {
	summaries := make([]TierSummary, 0, len(allTiers))

	for _, tier := range allTiers {
		summary := TierSummary{
			Tier: string(tier),
		}

		categoryMap := make(map[string]bool)
		hasRiskBand := false
		hasTelemetry := false
		hasTransform := false

		for _, mapping := range mappings {
			for _, allowedTier := range mapping.AllowedTiers {
				if allowedTier == string(tier) {
					summary.SignalCount++
					categoryMap[mapping.Category] = true

					if strings.Contains(mapping.SignalID, "risk_band") {
						hasRiskBand = true
					}
					if mapping.Category == "telemetry" {
						hasTelemetry = true
					}
					if mapping.Category == "transformation" {
						hasTransform = true
					}
					break
				}
			}
		}

		// Build category list
		for cat := range categoryMap {
			summary.Categories = append(summary.Categories, cat)
		}
		sort.Strings(summary.Categories)

		// Determine max risk level
		if hasRiskBand {
			summary.MaxRiskLevel = "critical"
		} else {
			summary.MaxRiskLevel = "none"
		}

		// Determine telemetry visibility
		if hasTelemetry {
			summary.TelemetryVisibility = "full"
		} else {
			summary.TelemetryVisibility = "none"
		}

		// Determine evidence capability
		if hasTransform {
			summary.EvidenceCapability = "canonical_export"
		} else {
			summary.EvidenceCapability = "basic_export"
		}

		// Positioning label
		summary.PositioningLabel = derivePositioningLabel(summary)

		summaries = append(summaries, summary)
	}

	return summaries
}

func derivePositioningLabel(summary TierSummary) string {
	switch summary.Tier {
	case "baseline":
		return "Authentication validation and basic event ingestion"
	case "proof":
		return "Adds anomaly detection and risk classification"
	case "shield":
		return "Adds anomaly detection and risk classification"
	case "fortress":
		return "Full signal access including all telemetry and transformations"
	default:
		return "Unknown tier"
	}
}

func outputTierExplanations(summaries []TierSummary) {
	for _, summary := range summaries {
		fmt.Printf("## Tier: %s\n\n", summary.Tier)
		fmt.Printf("**Purpose**: %s\n\n", getTierPurpose(summary.Tier))
		fmt.Printf("**Designed For**: %s\n\n", getTierAudience(summary.Tier))
		fmt.Printf("**Unlocks**:\n%s\n\n", getTierUnlocks(summary))
		fmt.Printf("**Limitations**:\n%s\n\n", getTierLimitations(summary))
	}
}

func getTierPurpose(tier string) string {
	switch tier {
	case "baseline":
		return "Provides authentication validation and basic event ingestion capabilities"
	case "proof":
		return "Adds anomaly detection and risk scoring for operational visibility"
	case "shield":
		return "Adds anomaly detection and risk scoring for operational visibility"
	case "fortress":
		return "Provides unrestricted access to all signals including telemetry and evidence transformation"
	default:
		return "Unknown"
	}
}

func getTierAudience(tier string) string {
	switch tier {
	case "baseline":
		return "Development and testing environments"
	case "proof":
		return "Production environments requiring risk monitoring"
	case "shield":
		return "Production environments requiring risk monitoring"
	case "fortress":
		return "Enterprise operations requiring full observability and compliance"
	default:
		return "Unknown"
	}
}

func getTierUnlocks(summary TierSummary) string {
	unlocks := []string{}
	for _, cat := range summary.Categories {
		unlocks = append(unlocks, fmt.Sprintf("• %s signals", cat))
	}
	if len(unlocks) == 0 {
		return "• None"
	}
	return strings.Join(unlocks, "\n")
}

func getTierLimitations(summary TierSummary) string {
	limitations := []string{}
	if summary.MaxRiskLevel == "none" {
		limitations = append(limitations, "• No risk band classification")
	}
	if summary.TelemetryVisibility == "none" {
		limitations = append(limitations, "• No system telemetry visibility")
	}
	if summary.EvidenceCapability == "basic_export" {
		limitations = append(limitations, "• No canonical evidence transformation")
	}
	if len(limitations) == 0 {
		return "• None"
	}
	return strings.Join(limitations, "\n")
}

func outputDifferentialAnalysis(mappings []SignalTierMapping, allTiers []tiers.Tier) {
	for i := 0; i < len(allTiers)-1; i++ {
		fromTier := string(allTiers[i])
		toTier := string(allTiers[i+1])

		fmt.Printf("## %s → %s\n\n", fromTier, toTier)

		newSignals := []string{}
		newCategories := make(map[string]bool)

		for _, mapping := range mappings {
			inFrom := contains(mapping.AllowedTiers, fromTier)
			inTo := contains(mapping.AllowedTiers, toTier)

			if inTo && !inFrom {
				newSignals = append(newSignals, mapping.SignalID)
				newCategories[mapping.Category] = true
			}
		}

		fmt.Printf("**New Signals Gained**: %d\n\n", len(newSignals))

		cats := []string{}
		for cat := range newCategories {
			cats = append(cats, cat)
		}
		sort.Strings(cats)
		fmt.Printf("**New Categories Gained**: %s\n\n", strings.Join(cats, ", "))

		fmt.Printf("**New Operational Visibility**: %s\n\n", getOperationalVisibility(cats))
		fmt.Printf("**New Incident Prevention Capability**: %s\n\n", getIncidentPrevention(cats))
	}
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func getOperationalVisibility(categories []string) string {
	if len(categories) == 0 {
		return "None"
	}
	visibility := []string{}
	for _, cat := range categories {
		switch cat {
		case "telemetry":
			visibility = append(visibility, "System health monitoring")
		case "anomaly":
			visibility = append(visibility, "Anomaly pattern detection")
		case "threshold":
			visibility = append(visibility, "Risk threshold classification")
		}
	}
	if len(visibility) == 0 {
		return "None"
	}
	return strings.Join(visibility, ", ")
}

func getIncidentPrevention(categories []string) string {
	if len(categories) == 0 {
		return "None"
	}
	prevention := []string{}
	for _, cat := range categories {
		switch cat {
		case "anomaly":
			prevention = append(prevention, "Early detection of payment failures")
		case "threshold":
			prevention = append(prevention, "Risk band escalation visibility")
		case "telemetry":
			prevention = append(prevention, "Backpressure and lag detection")
		}
	}
	if len(prevention) == 0 {
		return "None"
	}
	return strings.Join(prevention, ", ")
}

func buildPricingDataset(summaries []TierSummary) PricingDataset {
	dataset := PricingDataset{}

	for _, summary := range summaries {
		tier := PricingTier{
			SignalCount:            summary.SignalCount,
			ValueDensity:           calculateValueDensity(summary),
			RecommendedPriceAnchor: calculatePriceAnchor(summary),
		}

		switch summary.Tier {
		case "baseline":
			dataset.Baseline = tier
		case "proof":
			dataset.Proof = tier
		case "shield":
			dataset.Shield = tier
		case "fortress":
			dataset.Fortress = tier
		}
	}

	return dataset
}

func calculateValueDensity(summary TierSummary) string {
	categoryCount := len(summary.Categories)
	if categoryCount <= 2 {
		return "low"
	} else if categoryCount <= 4 {
		return "medium"
	} else if categoryCount <= 6 {
		return "high"
	}
	return "maximum"
}

func calculatePriceAnchor(summary TierSummary) string {
	// Structural pricing logic based on capabilities
	if summary.SignalCount < 5 {
		return "entry_tier"
	} else if summary.SignalCount < 15 {
		return "standard_tier"
	} else if summary.SignalCount < 25 {
		return "professional_tier"
	}
	return "enterprise_tier"
}
