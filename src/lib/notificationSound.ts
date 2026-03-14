/**
 * notificationSound.ts
 * Plays a powerful, professional multi-layered "ding" sound using the Web Audio API.
 * Designed to cut through noise and be very audible.
 */

let audioCtx: AudioContext | null = null;
let unlocked = false;

// Call this function on any user interaction (click, touch) to unlock the AudioContext
export function unlockAudio() {
    if (unlocked) return;
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
            unlocked = true;
        });
    } else {
        unlocked = true;
    }
}

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        const w = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
        audioCtx = new (window.AudioContext || w.webkitAudioContext)();
    }
    return audioCtx;
}

/**
 * Plays a strong, professional chime.
 * Uses multiple oscillators to create a richer, louder bell-like sound.
 */
export function playTicketSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // A very prominent, bright chime: Root + Fifth + Octave for fullness
        const chords = [
            // First strike
            { freqs: [523.25, 783.99, 1046.50], start: now, end: now + 0.4 },       // C5, G5, C6
            // Second strike (higher, more urgent)
            { freqs: [659.25, 987.77, 1318.51], start: now + 0.3, end: now + 0.8 }  // E5, B5, E6
        ];

        chords.forEach(({ freqs, start, end }) => {
            freqs.forEach((freq) => {
                // Main body of the sound (sine wave)
                const oscSine = ctx.createOscillator();
                oscSine.type = 'sine';
                oscSine.frequency.setValueAtTime(freq, start);

                // Attack/Bright transient (triangle wave for cut-through)
                const oscTriangle = ctx.createOscillator();
                oscTriangle.type = 'triangle';
                oscTriangle.frequency.setValueAtTime(freq, start);

                const gainNode = ctx.createGain();

                // Professional bell-like ADSR envelope
                gainNode.gain.setValueAtTime(0, start);
                gainNode.gain.linearRampToValueAtTime(0.6, start + 0.03); // Fast attack, louder
                gainNode.gain.exponentialRampToValueAtTime(0.001, end);   // Smooth long decay

                oscSine.connect(gainNode);
                oscTriangle.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscSine.start(start);
                oscTriangle.start(start);

                oscSine.stop(end);
                oscTriangle.stop(end);
            });
        });
    } catch (e) {
        console.warn('[NotificationSound] Could not play sound:', e);
    }
}

// Add an event listener to unlock audio automatically on first click anywhere in the document
if (typeof document !== 'undefined') {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
}
