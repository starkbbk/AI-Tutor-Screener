/**
 * Speech Adapter
 * 
 * Unified interface for speech recognition and synthesis.
 * Now primarily delegates to the patched core engine (speech.ts)
 * which handles both desktop (standard) and mobile (always-on) logic.
 */

import * as coreSpeech from './speech';
import { getDeviceType } from './speech-factory';

const device = getDeviceType();
const isMobile = device.isMobile;
const logPrefix = isMobile ? "[Mobile]" : "[Desktop]";

console.log(`[Speech Adapter] ENVIRONMENT: ${isMobile ? 'MOBILE' : 'DESKTOP'}`);

// Export types
export type { SpeechRecognitionResult }     from './speech';

// Export unified functions with logging
export const isSpeechRecognitionSupported = () => {
    console.log(`${logPrefix} isSpeechRecognitionSupported called`);
    return coreSpeech.isSpeechRecognitionSupported();
};

export const isSpeechSynthesisSupported = () => {
    console.log(`${logPrefix} isSpeechSynthesisSupported called`);
    return coreSpeech.isSpeechSynthesisSupported();
};

export const startListening = (...args: any[]) => {
    console.log(`${logPrefix} startListening called`);
    return (coreSpeech.startListening as any)(...args);
};

export const stopListening = () => {
    console.log(`${logPrefix} stopListening called`);
    return coreSpeech.stopListening();
};

export const speak = (...args: any[]) => {
    console.log(`${logPrefix} speak called`);
    return (coreSpeech.speak as any)(...args);
};

export const stopSpeaking = () => {
    console.log(`${logPrefix} stopSpeaking called`);
    return coreSpeech.stopSpeaking();
};

export const preloadVoices = () => {
    console.log(`${logPrefix} preloadVoices called`);
    return coreSpeech.preloadVoices();
};

export const getPreferredVoice = () => {
    console.log(`${logPrefix} getPreferredVoice called`);
    return coreSpeech.getPreferredVoice();
};

export const unlockMic = () => {
    console.log(`${logPrefix} unlockMic called`);
    return coreSpeech.unlockMic();
};

// New functions for "Always On" mobile logic
export const setInterviewActive = (active: boolean) => {
    console.log(`${logPrefix} setInterviewActive called: ${active}`);
    return coreSpeech.setInterviewActive(active);
};

// Export legacy names for compatibility
export const startListeningFinal = startListening;
export const startListeningStandard = startListening;
