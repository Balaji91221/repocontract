# Implementation decisions

The TypeScript compiler API is the analyzer adapter. The graph viewer is standalone HTML/SVG instead of a React build. Runtime validators reject unsupported rule shapes; the exported JSON Schema documents the same local config. Caching remains optional and has not been added without profiling.

The plan records the architecture and scope; README and generated TypeScript declarations are the executable API reference. These independent packages share no runtime framework.
