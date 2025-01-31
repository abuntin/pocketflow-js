# 6 - Agent

Finally, why I fell in love with this idea, the following is an _entire agent_. In essence, an agent becomes a [Flow](./4-flow.md) with a **start** node and **end** node, but when given LLMs, takes dynamic and recursive actions based on the inputs they receive. Then, by the same magic, you can add these agents as **(F)Nodes** connected by *Actions* in more complex directed graphs. 

This approach, whilst not as flashy as some other libraries out there (at the time of writing [**ElizaOS**](https://github.com/elizaOS/eliza) is getting some buzz, you should check them out) uses a combination of simple, easy-to-understand building blocks familiar to most developers, with the _direct access_ to the LLM itself. This gives _full control_ over the flow and allows you to integrate your own libraries seamlessly.  

### Example: Search Agent

This agent:
1. Decides whether to search or answer
2. If searches, loops back to decide if more search needed
3. Answers when enough context gathered

```javascript
import yaml from 'yaml'

class DecideAction extends FNode {
    async prep(shared: SharedData): Promise<[any, any]> {
        const context = shared['context'] ?? "No previous search"
        const query = shared['query']
        return [query, context]
    }

    async exec(inputs: [any, any]): Promise<any> {
        const [query, context] = inputs
        const prompt = `
            Given input: ${query}
            Previous search results: ${context}
            Should I: 1) Search web for more info 2) Answer with current knowledge
            Output in yaml:
            \`\`\`yaml
            action: search/answer
            reason: why this action
            search_term: search phrase if action is search
            \`\`\`
            `
        const res = await callLLM(prompt)
        const yamlStr = res.split("```yaml")[1].split("```")[0].trim()

        try {
            const result = yaml.parse(yaml_str)

            if (typeof result !== 'object' || result === null) {
                throw new Error("Result is not an object")
            }
            if (!("action" in result)) {
                throw new Error("Result does not contain 'action'")
            }
            if (!("reason" in result)) {
                throw new Error("Result does not contain 'reason'")
            }
            if (!(["search", "answer"].includes(result['action']))) {
                throw new Error("Action must be 'search' or 'answer'")
            }
            if (result.action === "search") {
                if(!("search_term" in result)) {
                    throw new Error("Search action must contain 'search_term'")
                }
                else if (typeof result['search_term'] !== 'string') {
                    throw new Error("Search term must be a string")
                }
            }
        } catch (e) {
            throw e
        }
        return result
    }

    async post(shared: SharedData, prepRes: any, execRes: any): Promise<any> {
        if (execRes['action'] === "search") {
            shared['search_term']= execRes['search_term']
        }
        return execRes.action
    }
}


class SearchWeb extends FNode {
    async prep(shared: SharedData): Promise<any> {
        return shared['search_term']
    }

    async exec(searchTerm: string): Promise<any> {
        return await searchWeb(searchTerm)
    }

    async post(shared: SharedData, prepRes: any, execRes: any): Promise<any> {
        const prevSearches = shared['context'] ?? []
        shared['context'] = prevSearches.concat([{ term: shared['search_term'], result: exec_res }])
        return "decide"
    }
}

class DirectAnswer extends FNode {
    async prep(shared: SharedData): Promise<[any, any]> {
        return [shared['query'], shared['context'] ?? ""]
    }

    async exec(inputs: [any, any]): Promise<any> {
        const [query, context] = inputs
        return await callLLM(`Context: ${context}\nAnswer: ${query}`)
    }

    async post(shared: SharedData, prepRes: any, execRes: any): Promise<any> | void {
        console.log(`Answer: ${exec_res}`)
        shared['answer'] = exec_res
    }
}


// Dummy implementations for callLLM and searchWeb
async function callLLM(prompt: string): Promise<string> {
  console.log("LLM called with prompt: " + prompt)
  return `\`\`\`yaml\naction: answer\nreason: Because I know the answer\n\`\`\``
}

async function searchWeb(term: string): Promise<any> {
    return `Search results for ${term}`
}

// Connect nodes
const decide = new DecideAction()
const search = new SearchWeb()
const answer = new DirectAnswer()

decide - "search" >> search
decide - "answer" >> answer
search - "decide" >> decide  // Loop back

const flow = new Flow(decide)
await flow.run({ query: "Who won the Nobel Prize in Physics 2024?" })

```