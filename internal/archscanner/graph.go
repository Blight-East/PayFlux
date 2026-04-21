package archscanner

import (
	"fmt"
)

func DetectCycles(domains []Domain) error {
	graph := make(map[string][]string)
	domainNames := make(map[string]bool)

	for _, d := range domains {
		graph[d.Name] = d.DependsOn
		domainNames[d.Name] = true
	}

	// 1. Check for references to non-existent domains
	for name, deps := range graph {
		for _, dep := range deps {
			if !domainNames[dep] {
				return fmt.Errorf("domain %q depends on missing domain %q", name, dep)
			}
			if name == dep {
				return fmt.Errorf("domain %q depends on itself", name)
			}
		}
	}

	// 2. DFS for Cycles
	visited := make(map[string]bool)
	recursionStack := make(map[string]bool)

	var dfs func(node string) error
	dfs = func(node string) error {
		visited[node] = true
		recursionStack[node] = true

		for _, dep := range graph[node] {
			if !visited[dep] {
				if err := dfs(dep); err != nil {
					return err
				}
			} else if recursionStack[dep] {
				return fmt.Errorf("dependency cycle detected involving %q", dep)
			}
		}

		recursionStack[node] = false
		return nil
	}

	for name := range graph {
		if !visited[name] {
			if err := dfs(name); err != nil {
				return err
			}
		}
	}

	return nil
}
