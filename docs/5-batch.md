# 5 - Batch

**Batch** makes it easier to handle large inputs in one Node or **rerun** a Flow multiple times. Handy for:
- **Chunk-based** processing (e.g., splitting large texts).
- **Multi-file** processing.
- **Iterating** over lists of params (e.g., user queries, documents, URLs).

## 1. BatchNode

A **BatchNode** extends `FNode` but changes `prep()` and `exec()`:

- **`prep(shared)`**: returns an **iterable** (e.g., list, generator), resolved using `Promise.all`.
- **`exec(item)`**: called **once** per item in that iterable.
- **`post(shared, prepRes, execResList)`**: after all items are processed, receives a **list** of results (`execResList`) and returns an **Action**.


### Example: Summarise a Large File

```javascript
class MapSummaries extends BatchNode {
    async prep(shared: SharedData) {   
        // Suppose we have a big file, chunk it
        let content = shared["data"].get("largeText.txt", "")
        let chunk_size = 10000
        let chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
        return chunks
    }

    async exec(chunk: string) {
        let prompt = f"Summarise this chunk in 10 words: {chunk}"
        let summary = await callLLM(prompt)
        return summary
    }

    async post(shared: SharedData, prepRes: any[], execResList: any[]) {
        let combined = "\n".join(execResList)
        shared["summary"]["largeText.txt"] = combined
        return "default"
    }
}
let mapSummaries = new MapSummaries()
const flow = new Flow(mapSummaries)
await flow.run(shared)
```

---

## 2. BatchFlow

A **BatchFlow** runs a **Flow** multiple times, each time with different `params`. Think of it as a loop that replays the Flow for each parameter set.  


### Example: Summarise Many Files

```javascript
class SummariseAllFiles extends BatchFlow {
    async prep(shared: SharedData) {
        // Return a list of param records (one per file)
        let filenames = Object.keys(shared["data"])  // e.g., ["file1.txt", "file2.txt", ...]
        return filenames.map((fn) => ({ filename: fn }))
    }
}

// Suppose we have a per-file Flow (e.g., loadFile >> summarise >> reduce):
let summariseFile = new SummariseFile(loadFile)

// Wrap that flow into a BatchFlow:
const summariseAllFiles = new SummariseAllFiles(summariseFile)
await summariseAllFiles.run(shared)
```

### Under the Hood
1. `prep(shared)` returns a list of param records—e.g., `[{filename: "file1.txt"}, {filename: "file2.txt"}, ...]`.
2. The **BatchFlow** loops through each record. For each one:
   - It merges the record with the BatchFlow’s own `params`.
   - It calls `flow.run(shared)` using the merged result.
3. This means the sub-Flow is run **repeatedly**, once for every param record.

---

## 3. Nested or Multi-Level Batches

You can nest a **BatchFlow** in another **BatchFlow**. For instance:
- **Outer** batch: returns a list of directory param records (e.g., `{"directory": "/pathA"}`, `{"directory": "/pathB"}`, ...).
- **Inner** batch: returning a list of per-file param records.

At each level, **BatchFlow** merges its own param record with the parent’s. By the time you reach the **innermost** node, the final `params` is the merged result of **all** parents in the chain. This way, a nested structure can keep track of the entire context (e.g., directory + file name) at once.

```javascript
import fs from 'fs'

class FileBatchFlow extends BatchFlow {
    async prep(shared: SharedData) { 
        let directory = this.params["directory"]
        // Isn't node just great for async stuff?
        let files = await Promise.all(fs.readdir(directory, (err, files) => {
            return files.filter(file => file.endsWith(".txt"))
        }))
        return files.map((f) => ({ filename: f }))
    }
}

class DirectoryBatchFlow extends BatchFlow {
    async prep(shared: SharedData) {
        let directories = ["/path/to/dirA", "/path/to/dirB"]
        return directores.map((d) => ({ directory: d }))
    }
}

const innerFlow = new FileBatchFlow(new MapSummaries())
const outerFlow = new DirectoryBatchFlow(innerFlow)

await outerFlow.run(shared)
```