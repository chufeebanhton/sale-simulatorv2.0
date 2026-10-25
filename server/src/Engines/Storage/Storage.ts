import { Product } from "../../interfaces/Product.types.js";

export class ProductCache {
    private cache = new Map<string, Product>();
    private length: number = 0;
    private exis: boolean = false
    constructor(data: Product[]) {
        this.callBack(data);    
    };

    private set(data: Product): void {
        const key = `${data._id}:${data.name}`;
        this.cache.set(key, data);
    }

    isExist(): Boolean {
        return this.exis;
    };

    size(): number {
        return this.cache.size;
    } 

    callBack(data: Product[]): void {
        data.map((item, index) => {
            const key = `${item._id}:${item.name}`;
            this.cache.set(
                key,
                item)
        });
        this.length = data.length;
        this.exis = true;
        
    }

    async get(page: number = 0, limit: number = this.length): Promise<Product[]> {
        const start = limit * (page - 1);
        const end = start + limit;
        if (page < 1 || limit < 0 ) {
            throw new Error('Invalid input CACHE REQUEST')
        } else {
            limit > this.length ? limit = this.length : limit;
            const result = [...this.cache.values()];
            if (!result) throw new Error('CACHE REQUEST ERROR!');
            return result.slice(start, end);
        }
    }
    async post(data: Product): Promise<Product> {
            this.set(data);
            const key = `${data._id}:${data.name}`;
            const result = this.cache.get(key)
            if (!result) throw new Error('Set Value Cache Error');
            this.length++;
            return result;
    }
}