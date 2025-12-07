declare module "better-sqlite3" {
  interface Statement<P = any, R = any> {
    run(...params: any[]): { changes: number; lastInsertRowid: number };
    get(...params: any[]): R | undefined;
    all(...params: any[]): R[];
    bind(...params: any[]): Statement<P, R>;
  }

  class Database {
    constructor(filename: string, options?: any);
    prepare<R = any>(sql: string): Statement<any, R>;
    exec(sql: string): Database;
    pragma(pragma: string): any;
    close(): void;
  }

  export default Database;
}
