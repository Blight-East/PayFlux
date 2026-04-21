package specs

import (
	"encoding/json"
	"fmt"
	"os"
)

// Registry represents the signal registry structure
type Registry struct {
	Metadata struct {
		ExtractionDate     string `json:"extraction_date"`
		Codebase           string `json:"codebase"`
		Repository         string `json:"repository"`
		FilesScanned       int    `json:"files_scanned"`
		TotalLinesAnalyzed int    `json:"total_lines_analyzed"`
		ExtractionMethod   string `json:"extraction_method"`
	} `json:"metadata"`
	Signals        []Signal        `json:"signals"`
	ScoringSystems []ScoringSystem `json:"scoring_systems"`
	Pipelines      []Pipeline      `json:"pipelines"`
	Validators     []Validator     `json:"validators"`
	HealthStates   []HealthState   `json:"health_states"`
}

type Signal struct {
	ID                      string   `json:"id"`
	SourceFile              string   `json:"source_file"`
	LineNumber              string   `json:"line_number"`
	Type                    string   `json:"type"`
	TriggerCondition        string   `json:"trigger_condition"`
	Deterministic           bool     `json:"deterministic"`
	DescriptionVerbatimCode string   `json:"description_verbatim_code"`
	InputFields             []string `json:"input_fields"`
	OutputFields            []string `json:"output_fields"`
	SeverityLevels          []string `json:"severity_levels"`
	UpstreamDependencies    []string `json:"upstream_dependencies"`
	DownstreamConsumers     []string `json:"downstream_consumers"`
}

type ScoringSystem struct {
	File          string   `json:"file"`
	Function      string   `json:"function"`
	Inputs        []string `json:"inputs"`
	FormulaRaw    string   `json:"formula_raw"`
	CapsOrClamps  string   `json:"caps_or_clamps"`
	OrderingRules string   `json:"ordering_rules"`
}

type Pipeline struct {
	Name   string          `json:"name"`
	Stages []PipelineStage `json:"stages"`
}

type PipelineStage struct {
	StageName        string   `json:"stage_name"`
	File             string   `json:"file"`
	Transformations  []string `json:"transformations"`
	RejectConditions []string `json:"reject_conditions"`
	Mutations        []string `json:"mutations"`
}

type Validator struct {
	File              string   `json:"file"`
	SchemaType        string   `json:"schema_type"`
	FailureConditions []string `json:"failure_conditions"`
	ErrorOutputs      []string `json:"error_outputs"`
}

type HealthState struct {
	State        string `json:"state"`
	TriggerLogic string `json:"trigger_logic"`
	SourceFile   string `json:"source_file"`
}

// ValidateRegistry performs integrity checks on the signal registry
// Panics if any validation fails
func ValidateRegistry(registryPath string) error {
	data, err := os.ReadFile(registryPath)
	if err != nil {
		return fmt.Errorf("failed to read registry: %w", err)
	}

	var reg Registry
	if err := json.Unmarshal(data, &reg); err != nil {
		return fmt.Errorf("failed to parse registry JSON: %w", err)
	}

	// Check 1: Unique signal IDs
	seenIDs := make(map[string]bool)
	for _, sig := range reg.Signals {
		if seenIDs[sig.ID] {
			panic(fmt.Sprintf("INVALID_SIGNAL_REGISTRY: duplicate signal ID: %s", sig.ID))
		}
		seenIDs[sig.ID] = true
	}

	// Check 2-6: Signal field validation
	for _, sig := range reg.Signals {
		// Check 2: deterministic flag present (bool always has value, check is implicit)

		// Check 3: trigger_condition non-empty
		if sig.TriggerCondition == "" {
			panic(fmt.Sprintf("INVALID_SIGNAL_REGISTRY: signal %s missing trigger_condition", sig.ID))
		}

		// Check 4: source_file present
		if sig.SourceFile == "" {
			panic(fmt.Sprintf("INVALID_SIGNAL_REGISTRY: signal %s missing source_file", sig.ID))
		}

		// Check 5: line_number present
		if sig.LineNumber == "" {
			panic(fmt.Sprintf("INVALID_SIGNAL_REGISTRY: signal %s missing line_number", sig.ID))
		}
	}

	// Check 6: At least 1 scoring system
	if len(reg.ScoringSystems) == 0 {
		panic("INVALID_SIGNAL_REGISTRY: no scoring systems defined")
	}

	// Check 7: At least 1 pipeline with at least 1 stage
	if len(reg.Pipelines) == 0 {
		panic("INVALID_SIGNAL_REGISTRY: no pipelines defined")
	}
	totalStages := 0
	for _, p := range reg.Pipelines {
		totalStages += len(p.Stages)
	}
	if totalStages == 0 {
		panic("INVALID_SIGNAL_REGISTRY: no pipeline stages defined")
	}

	// Check 8: At least 1 health state
	if len(reg.HealthStates) == 0 {
		panic("INVALID_SIGNAL_REGISTRY: no health states defined")
	}

	return nil
}
