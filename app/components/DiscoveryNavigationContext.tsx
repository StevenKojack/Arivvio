"use client";
import {createContext,useContext} from "react";
const DiscoveryNavigation=createContext(false);
export function DiscoveryNavigationProvider({enabled,children}:{enabled:boolean;children:React.ReactNode}){
 return <DiscoveryNavigation.Provider value={enabled}>{children}</DiscoveryNavigation.Provider>;
}
export function useDiscoveryNavigation(){return useContext(DiscoveryNavigation);}
