package archscanner

import (
	"encoding/json"
	"fmt"
	"os"
)

type Taxonomy struct {
	SchemaVersion string      `json:"schema_version"`
	System        System      `json:"system"`
	Domains       []Domain    `json:"domains"`
	Primitives    []Primitive `json:"primitives"`
	Artifacts     []Artifact  `json:"artifacts"`
}

type System struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	GeneratedAt string `json:"generated_at"`
}

type Domain struct {
	Name      string   `json:"name"`
	Layer     string   `json:"layer"`
	Path      string   `json:"path"`
	Purpose   string   `json:"purpose"`
	DependsOn []string `json:"depends_on"`
}

type Primitive struct {
	Name           string   `json:"name"`
	Layer          string   `json:"layer"`
	Responsibility string   `json:"responsibility"`
	Inputs         []string `json:"inputs"`
	Outputs        []string `json:"outputs"`
	Determinism    string   `json:"determinism"`
	Bounded        bool     `json:"bounded"`
	Hash           string   `json:"hash"`
	File           string   `json:"file"`
	Notes          string   `json:"notes"`
}

type Artifact struct {
	Name   string `json:"name"`
	Type   string `json:"type"`
	Source string `json:"source"`
	Schema string `json:"schema"`
}

func LoadTaxonomy(path string) (*Taxonomy, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read taxonomy file: %w", err)
	}

	var t Taxonomy
	if err := json.Unmarshal(data, &t); err != nil {
		return nil, fmt.Errorf("failed to parse taxonomy JSON: %w", err)
	}

	return &t, nil
}
