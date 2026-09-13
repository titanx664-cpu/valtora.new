export type Id<T extends string = string> = string & { readonly __table?: T };
export type Doc<T extends string = string> = Record<string, any> & { _id: Id<T>; _creationTime: number };
