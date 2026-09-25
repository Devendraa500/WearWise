import { randomUUID } from 'node:crypto';
export type Asset={id:string;type:string;storageKey:string;mimeType:string;width:number;height:number}; type Profile={id:string;name:string;assets:Asset[]}; type Product={id:string;title:string;category?:string;price?:number;currency?:string;imageUrls:string[];sourceUrl?:string}; type Job={id:string;providerJobId:string;profileId:string;product:Product;status:string;errorCode?:string;provider?:string;attempts?:string[];result?:{id:string;storageKey:string;createdAt:string}};
export const db={profile:undefined as Profile|undefined, products:new Map<string,Product>(), jobs:new Map<string,Job>(), results:new Map<string,Job>()};
export const id=()=>randomUUID();
