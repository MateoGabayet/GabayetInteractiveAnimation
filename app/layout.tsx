import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Gabayet — Live Visual Studio',description:'Compose sound-reactive visual performances with Mateo Gabayet’s original stencil archive.',metadataBase:new URL('https://gabayet-interactive-animation.vercel.app')};
export default function Layout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
