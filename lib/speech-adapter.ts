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
const engine = device.isMobile ? mobileSpeech : desktopSpeech;

console.log(`[Speech Adapter] Using ${device.isMobile ? 'MOBILE' : 'DESKTOP'} speech engine.`);

// Export types
export type { SpeechRecognitionResult } from './speech';

// Export unified functions (delegated to the selected engine)
export const isSpeechRecognitionSupported = engine.isSpeechRecognitionSupported;
export const isSpeechSynthesisSupported = engine.isSpeechSynthesisSupported;
export const startListening = engine.startListening;
export const stopListening = engine.stopListening;
export const speak = engine.speak;
export const stopSpeaking = engine.stopSpeaking;
export const preloadVoices = engine.preloadVoices;
export const getPreferredVoice = engine.getPreferredVoice;
export const unlockMic = engine.unlockMic;

// Export legacy names for compatibility
export const startListeningFinal = engine.startListening;
export const startListeningStandard = engine.startListening;
