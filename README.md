<h1 align="center">PocketFlow-JS - LLM Framework in 100 Lines</h1>

<h1 align="center">Adapted with 🖤 from <a href="https://github.com/miniLLMFlow/PocketFlow">miniLLMFlow/PocketFlow</a></h1>

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![Docs](https://img.shields.io/badge/docs-latest-blue)](https://minillmflow.github.io/PocketFlow/)

<div align="center">
  <img src="./assets/minillmflow.jpg" width="400"/>
</div>

<br>

A [100-line](index.ts) minimalist LLM framework for ([Multi-](https://minillmflow.github.io/PocketFlow/multi_agent.html))[Agents](https://minillmflow.github.io/PocketFlow/agent.html), [Task Decomposition](https://minillmflow.github.io/PocketFlow/decomp.html), [RAG](https://minillmflow.github.io/PocketFlow/rag.html), etc.

Check out the original Python implementation here [PocketFlow](https://github.com/miniLLMFlow/PocketFlow). They actually manage to do it in 100 lines **flat**.

Why Typescript (Javascript)? Based on my arbitrary and biased judgement, in order:

- asyncio sucks
- JavaScript is easily the most popular language for product development
- TypeScript is, well, typed, and LLMs love being sure about things beforehand (typing in Python is almost as ugly as asyncio)
- The most popular AI development tools are increasingly training on JavaScript / TypeScript data (à la build-me-a-website-from-scratch)

The rest of this README is **copy pasta** from the original repository. again, please do check them out! 

Original PocketFlow GitHub: [PocketFlow GitHub](https://github.com/miniLLMFlow/PocketFlow)

PocketFlow Documentation: [PocketFlow Documentation](https://minillmflow.github.io/PocketFlow/)

<br>

## Why PocketFlow?

PocketFlow is designed to be **the framework used by LLMs**. In the future, LLM projects will be *self-programmed* by LLMs themselves: Users specify requirements, and LLMs will design, build, and maintain. Current LLMs are:

1. **👍 Good at Low-level Details:** LLMs can handle details like *wrappers, tools, and prompts*, which don't belong in a framework. Current frameworks are over-engineered, making them hard for humans (and LLMs) to maintain.

2. **👎 Bad at High-level Paradigms:** While paradigms like *MapReduce, Task Decomposition, and Agents* are powerful, LLMs still struggle to design them elegantly. These high-level concepts should be emphasized in frameworks.

The ideal framework for LLMs should (1) **strip away low-level implementation details**, and (2) **keep high-level programming paradigms**. Hence, we ([they](https://github.com/miniLLMFlow/PocketFlow), I just rewrote it lol) provide this minimal (100-line) framework that allows LLMs to focus on what matters.  

Pocket Flow is also a *learning resource*, as current frameworks abstract too much away.

