type DbType = 0 | 1 | 2 | 3;

export const MySQL:DbType = 0
export const PGSQL:DbType = 1
export const MSSQL:DbType = 2
export const SQLITE:DbType = 3

export interface ConnConf{
    type:number,
    name:string,
    host:string,
    port:number,
    user:string,
    password:string
}
