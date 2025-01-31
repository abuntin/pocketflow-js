# 3 - Node (or FNode)

This is probably the only drawback of using TypeScript, had to call this FNode because Node is a protected keyword in _most_ TypeScript environments. I'll call it a Node anyway (minus the profanity) because this doc is primarily about graph theory **not** the god-level runtime. 

A **Node** is the smallest building block. Each Node has 3 steps:

1. `prep(shared)`
   - A reliable step for preprocessing data from the `shared` store. 
   - Examples: *query DB, read files, or serialize data into a string*.
   - Returns `prepRes`, which is used by `exec()` and `post()`.

2. `exec(prepRes)`
   - The **main execution** step, with optional retries and error handling (below).
   - Examples: *primarily for LLMs, but can also for remote APIs*.
   - ⚠️ If retries enabled, ensure idempotent implementation.
   - ⚠️ This must **NOT** write to `shared`. If reads are necessary, extract them in `prep()` and pass them in `prepRes`.
   - Returns `execRes`, which is passed to `post()`.

3. `post(shared, prepRes, execRes)`
   - A reliable postprocessing step to write results back to the `shared` store and decide the next Action. 
   - Examples: *update DB, change states, log results, decide next Action*.
   - Returns a **string** specifying the next Action (`"default"` if `void`).

> All 3 steps are optional. You could run only `prep` if you just need to prepare data without calling the LLM.

> Also note that almost all FNode functions are async, so you can run  both synchronous and asynchronous code, which lends **really well** to parallel execution and the asynchronous LLM calls. 

>Ten points to JavaScript.


### Fault Tolerance & Retries

Nodes can **retry** execution if `exec()` raises an exception. You control this via two parameters when you create the Node:

- `maxRetries` (int): How many times to try running `exec()`. The default is `1`, which means **no** retry.
- `wait` (int): The time to wait (in **seconds**) before each retry attempt. By default, `wait=0` (i.e., no waiting). Increasing this is helpful when you encounter rate-limits or quota errors from your LLM provider and need to back off.

```javascript 
let myNode = new SummarizeFile(3, 10) // maxRetries=3, wait=10
```

When an exception occurs in `exec()`, the Node automatically retries until:

- It either succeeds, or
- The Node has retried `maxRetries - 1` times already and fails on the last attempt.

### Graceful Fallback

If you want to **gracefully handle** the error rather than throwing it, you can override:

By default, it just throws `error`. But you can return a fallback result instead, which becomes the `execRes` passed to `post()`.

```javascript 
async function execFallback(prepRes, error) {
    throw error
    // or for example,
    return fallbackRes 
}
```

### Example: Summarize file

```javascript 
class SummarizeFile extends FNode {
    constructor(maxRetries: number = 1, wait: number = 0, currentRetry: number = 0) {
        super()
        this.maxRetries = maxRetries
        this.wait = wait
        this.currentRetry = currentRetry // let's you track retries from outside the Node
    }
    async prep(shared: SharedData) {
        // all synchronous code
        let filename = this.params["filename"]
        return shared["data"][filename]
    }
    async exec(prepRes: any) {
        if (!prepRes) throw new Error("Empty file content!")
        let prompt = `Summarize this text in 10 words: ${prepRes}`
        // an async LLM call, no problems at all
        let summary = await callLLM(prompt)
        return summary
    }
    async execFallback(prepRes, error) {
        return "There was an error processing your request." 
    }

    async post(shared: SharedData, prepRes: any, execRes: any) {
        let filename = this.params["filename"]
        shared["summary"][filename] = execRes
        // Return "default" by not returning anything
    }
}

let summariseNode = new SummarizeFile(3) // maxRetries=3
summariseNode.setParams({"filename": "testFile.txt"})

// node.run() calls prep->exec->post
// If exec() fails, it retries up to 3 times before calling execFallback()
let actionResult = await summariseNode.run(shared)

print("Action returned:", actionResult)  // Usually "default"
print("Summary stored:", shared["summary"].get("testFile.txt"))
```  