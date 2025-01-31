interface SharedData { [key: string]: any }
interface Params { [key: string]: any }
interface Base {
    params: Params
    successors: Record<string, Base>
    setParams: (params: Params) => void
    addSuccessor: (node: Base, action?: string) => Base
    prep: (shared: SharedData) => Promise<any>
    exec(prepRes: any): Promise<any>
    post(shared: SharedData, prepRes: any, execRes: any): Promise<any>
    _exec(prepRes: any): Promise<any>
    _run(shared: SharedData): Promise<any>
    run(shared: SharedData): Promise<any>
}

class ConditionalTransition {
    src: BaseNode
    action: string
    constructor(src: BaseNode, action: string) {
        this.src = src
        this.action = action
    }
    '>>'(tgt: Base): Base { return this.src.addSuccessor(tgt, this.action) }
}

class BaseNode implements Base {
    params: Params = {}
    successors: Record<string, Base> = {}
    setParams = (params: Params): void => {
        this.params = params
    }
    addSuccessor(node: Base, action: string = 'default'): Base {
        if (Object.keys(this.successors).includes(action)) console.warn(`Overwriting successor for action '${action}'`)
        this.successors[action] = node
        return node
    }
    async prep(shared: SharedData): Promise<any> { }
    async exec(prepRes: any): Promise<any> { }
    async post(shared: SharedData, prepRes: any, execRes: any): Promise<any> { }
    async _exec(prepRes: any): Promise<any> {
        return await this.exec(prepRes)
    }
    async _run(shared: SharedData): Promise<any> {
        const prepRes = await this.prep(shared)
        const execRes = await this._exec(prepRes)
        return await this.post(shared, prepRes, execRes)
    }
    async run(shared: SharedData): Promise<any> {
        if (Object.keys(this.successors).length > 0) console.warn("Node won't run successors. Use Flow.")
        return await this._run(shared)
    }
    '>>'(node: Base): Base { return this.addSuccessor(node) }
    '-'(action: string): ConditionalTransition {
        if (typeof action !== 'string') throw new TypeError("Action must be a string")
        return new ConditionalTransition(this, action)
    }
}
class FNode extends BaseNode {
    maxRetries: number
    wait: number
    currentRetry: number
    constructor(maxRetries: number = 1, wait: number = 0, currentRetry: number = 0) {
        super()
        this.maxRetries = maxRetries
        this.wait = wait
        this.currentRetry = currentRetry
    }
    async execFallback(prepRes: any, error: Error): Promise<any> { throw error }
    async _exec(prepRes: any): Promise<any> {
        for (this.currentRetry; this.currentRetry < this.maxRetries; this.currentRetry++) {
            try { return await this.exec(prepRes) }
            catch (e) {
                if (this.currentRetry === this.maxRetries - 1) return await this.execFallback(prepRes, e)
                if (this.wait > 0) { // Simulate time.sleep
                    const start = Date.now()
                    while (Date.now() - start < this.wait * 1000) {/* Wait */ }
                }
            }
        }
    }
}
class BatchNode extends FNode {
    async _exec(items: any[]): Promise<any[]> { return Promise.all(items.map((i) => super._exec(i))) }
}
class Flow extends BaseNode {
    start: FNode
    constructor(start: FNode) {
        super()
        this.start = start
    }
    next(curr: Base, action?: string) {
        const nxt = curr.successors[action || 'default']
        if (!nxt && Object.keys(curr.successors).length > 0) console.warn(`Flow ends: '${action}' not found in ${Object.keys(curr.successors)}`)
        return nxt
    }
    async orch(shared: SharedData, params: Params = {}): Promise<void> {
        let curr: Base | undefined = this.start
        let currentParams = { ...this.params, ...params }
        while (curr) {
            curr.setParams(currentParams)
            const actionResult = await curr._run(shared)
            if (typeof actionResult === "string") curr = { ...this.next(curr, actionResult) }
            else curr = { ...this.next(curr) }
        }
    }
    async run(shared: SharedData) {
        const prepRes = this.prep(shared)
        this.orch(shared)
        return this.post(shared, prepRes, null)
    }
    async exec(prepRes: any): Promise<any> { throw new Error('Flow cannot exec') }
}
class BatchFlow extends Flow {
    async _run(shared: SharedData): Promise<any> {
        const prepRes = await this.prep(shared) || []
        for (const batchParams of prepRes) await this.orch(shared, { ...this.params, ...batchParams })
        return await this.post(shared, prepRes, null)
    }
}
