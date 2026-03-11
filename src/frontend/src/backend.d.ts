import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PVSession {
    id: string;
    owner: Principal;
    data: string;
    name: string;
    timestamp: Time;
}
export interface WattpilotSession {
    id: string;
    owner: Principal;
    data: string;
    name: string;
    timestamp: Time;
}
export interface PremiumSession {
    id: string;
    owner: Principal;
    data: string;
    name: string;
    timestamp: Time;
}
export type Time = bigint;
export interface TarifStufe {
    id: string;
    preis: number;
    farbe: string;
}
export interface AnalyticsResult {
    id: string;
    selfConsumptionRate: number;
    totalEVCharging: number;
    autarkyRate: number;
    totalGridFeedIn: number;
    owner: Principal;
    totalGridDraw: number;
    totalPVGeneration: number;
    pvShareOfEVCharging: number;
    timestamp: Time;
}
export interface TarifPeriode {
    id: string;
    bis: string;
    von: string;
    stufen: Array<TarifStufe>;
    owner: Principal;
    einspeiseStufen: Array<TarifStufe>;
    zuordnungBezug: Array<Array<string>>;
    bezugStufen: Array<TarifStufe>;
    zuordnungEinspeisung: Array<Array<string>>;
}
export interface UserProfile {
    principal: Principal;
    co2Faktor: number;
    registeredAt: Time;
    waehrung: string;
    pvName: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPVSession(id: string, name: string, data: string): Promise<void>;
    addTarifPeriode(periode: TarifPeriode): Promise<void>;
    addWattpilotSession(id: string, name: string, data: string): Promise<void>;
    addPremiumSession(id: string, name: string, data: string): Promise<void>;
    appendPremiumSessionData(id: string, chunk: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteSession(id: string, sessionType: string): Promise<void>;
    deleteTarifPeriode(id: string): Promise<void>;
    getAllProfiles(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLatestAnalyticsResult(): Promise<AnalyticsResult | null>;
    getMyProfile(): Promise<UserProfile | null>;
    getPVSampleData(): Promise<string>;
    getPVSessions(): Promise<Array<PVSession>>;
    getPremiumSessions(): Promise<Array<PremiumSession>>;
    getSession(id: string, sessionType: string): Promise<string>;
    getTarifPerioden(): Promise<Array<TarifPeriode>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWattpilotSampleData(): Promise<string>;
    getWattpilotSessions(): Promise<Array<WattpilotSession>>;
    isCallerAdmin(): Promise<boolean>;
    isRegistered(): Promise<boolean>;
    registerUser(pvName: string): Promise<void>;
    saveAnalyticsResult(id: string, result: AnalyticsResult): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCo2Faktor(co2Faktor: number): Promise<void>;
    updateTarifPeriode(periode: TarifPeriode): Promise<void>;
    updateWaehrung(waehrung: string): Promise<void>;
}
