/**
 * Speech Adapter
 * 
 * Delegates speech recognition and synthesis to either:
 * - standard engine (speech.ts) for desktop
 * - mobile-optimized engine (speech-mobile.ts) for iOS/Android
 */

import * as desktopSpeech from './speech';
import * as mobileSpeech from './speech-mobile';
import { getDeviceType } from './speech-factory';

const device = getDeviceType();
const isMobile = device.isMobile;
const engine = isMobile ? mobileSpeech : desktopSpeech;
const logPrefix = isMobile ? "[Mobile]" : "[Desktop]";

console.log(`[Speech Adapter] ENVIRONMENT: ${isMobile ? 'MOBILE' : 'DESKTOP'}`);
console.log(`[Speech Adapter] OS: ${device.isIOS ? 'iOS' : device.isAndroid ? 'Android' : 'Other'}`);

// Export types
export type { SpeechRecognitionResult } from './speech';

// Export unified functions with logging
export const isSpeechRecognitionSupported = () => {
    console.log(`${logPrefix} isSpeechRecognitionSupported called`);
    return engine.isSpeechRecognitionSupported();
};

export const isSpeechSynthesisSupported = () => {
    console.log(`${logPrefix} isSpeechSynthesisSupported called`);
    return engine.isSpeechSynthesisSupported();
};

export const startListening = (...args: any[]) => {
    console.log(`${logPrefix} startListening called`);
    return (engine.startListening as any)(...args);
};

export const stopListening = () => {
    console.log(`${logPrefix} stopListening called`);
    return engine.stopListening();
};

export const speak = (...args: any[]) => {
    console.log(`${logPrefix} speak called`);
    return (engine.speak as any)(...args);
};

export const stopSpeaking = () => {
    console.log(`${logPrefix} stopSpeaking called`);
    return engine.stopSpeaking();
};

export const preloadVoices = () => {
    console.log(`${logPrefix} preloadVoices called`);
    return engine.preloadVoices();
};

export const getPreferredVoice = () => {
    console.log(`${logPrefix} getPreferredVoice called`);
    return engine.getPreferredVoice();
};

export const unlockMic = () => {
    console.log(`${logPrefix} unlockMic called`);
    return engine.unlockMic();
};

// Export legacy names for compatibility
export const startListeningFinal = startListening;
export const startListeningStandard = startListening;
