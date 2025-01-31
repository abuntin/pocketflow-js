# 2 - LLM Wrappers  

## Why Not Provide Built-in LLM Wrappers?
Original author [miniLLMFlow/PocketFlow](https://github.com/miniLLMFlow) believes it's **bad practice** to provide LLM-specific implementations in a general framework:
- **LLM APIs change frequently**. Hardcoding them makes maintenance a nighmare.
- You may need **flexibility** to switch vendors, use fine-tuned models, or deploy local LLMs.
- You may need **optimizations** like prompt caching, request batching, or response streaming.

I agree, but I'm also too lazy to write them for you.

```javascript
// Ollama 

// If you're cheap like me lol

import ollama from "ollama"

async function callLLM(prompt: string) {
    const response = await ollama.generate({
        model: 'llama3.1',
        prompt
        // other options
    })
    return response.message.content
}

// Example usage
callLLM("How are you?")
```

```javascript

// OpenRouter using OpenAI SDK

import OpenAI from "openai"

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
})

async function callLLM(prompt: string) {
    let r = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{"role": "user", "content": prompt}]
        // other options
    })
    return r.choices[0].message.content
}

// Example usage
callLLM("How are you?")
```

> Store any API keys in an environment variable / .env file like OPENROUTER_API_KEY for security.

## Improvements
Feel free to enhance your `callLLM` function as needed. Here are examples:

- Handle chat history:

```javascript
async function callLLM(messages) {
    let r = await ollama.chat({
        model:"llama3.1",
        messages
    })
    return r.message.content
}
```

- Caching: You can use [node-cache](https://www.npmjs.com/package/node-cache), or any other caching library from the depths of npm. Recommend creating your own decorator function for ease of use though. Here's an example:

```javascript
import NodeCache from "node-cache"

function CacheDecorator(cache: NodeCache, timeout: number = 60 * 5) {
    // target: class instance
    // propertyKey: method name
    // descriptor: method descriptor
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

        // save the original method
        const originalMethod = descriptor.value

        // assign a new method that generates a cache key and returns a cached result if available
        descriptor.value = async function (...args: any[]) {
            const cacheKey = `${propertyKey}_${JSON.stringify(args)}`
            const cachedResult = cache.get(cacheKey)
        
            if (cachedResult) {
                console.log(`Returning cached result for ${propertyKey}`)
                return cachedResult
            }

            const result = await originalMethod.apply(this, args)
            cache.set(cacheKey, result, timeout) // Cache for 5 minutes

            console.log(`Caching result for ${propertyKey}`)

            return result
        }
        return descriptor
    }
}

const cache = new NodeCache()

@CacheDecorator(cache)
async function callLLM(prompt):
    # Your implementation here
    return "Hello, World!"
```