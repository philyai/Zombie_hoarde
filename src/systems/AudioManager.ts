import { saveManager } from './SaveManager'
type Cue = 'jump' | 'land' | 'coin' | 'convert' | 'hit' | 'smash' | 'heavy' | 'power' | 'mission' | 'death' | 'click'
/** Original synthesized square-wave cues; no external recordings. */
class AudioManager {
  private context?: AudioContext
  private beat = 0
  unlock(): void { try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}) } catch { /* Optional audio. */ } }
  private tone(frequency: number, duration: number, volume: number, end = frequency): void {
    const ctx = this.context
    if (!ctx || ctx.state !== 'running') return
    const oscillator = ctx.createOscillator(), gain = ctx.createGain()
    oscillator.type = 'square'; oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), ctx.currentTime + duration)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    oscillator.connect(gain); gain.connect(ctx.destination)
    oscillator.start(); oscillator.stop(ctx.currentTime + duration)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }
  play(cue: Cue): void {
    if (!saveManager.load().settings.sound) return
    const notes: Record<Cue, [number, number, number]> = { jump: [190, .13, 420], land: [70, .04, 45], coin: [880, .08, 1400], convert: [240, .14, 580], hit: [130, .18, 35], smash: [80, .25, 25], heavy: [65, .65, 22], power: [330, .25, 990], mission: [660, .4, 1320], death: [150, .6, 25], click: [400, .04, 520] }
    const [f, d, e] = notes[cue]; this.tone(f, d, .025, e)
  }
  music(elapsed: number, menu = false): void {
    const beat = Math.floor(elapsed / (menu ? 450 : 300))
    if (beat === this.beat) return
    this.beat = beat
    if (saveManager.load().settings.music) this.tone([65, 65, 98, 87, 65, 78, 98, 58][beat % 8], .17, .012)
  }
}
export const audio = new AudioManager()
