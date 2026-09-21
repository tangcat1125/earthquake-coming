/* ==========================================================================
   時間迴圈 × 錯誤連鎖 - 地震實境 RPG Logic Engine (Categorized Assets & Outcome Artwork)
   ========================================================================== */

// --- Audio & Music Synthesizer Engine (Real Audio Files + Web Audio API) ---
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.unlocked = false;

        // Real Audio File Paths
        this.sfxAlarmPath = "music/voice/alarm/taiwan_emergency_alarm.mp3";
        this.sfxQuakePath = "music/voice/quake/earthquake_rumble.mp3";
        this.sfxFallingPath = "music/voice/falling/falling_objects.mp3";

        this.bgmTracks = [
            "music/1/The_Desks_Below.mp3",
            "music/2/Pinned_Under_Iron.mp3"
        ];
        this.bgmGoodEndPath = "music/good_end/Breath_After_the_Climb.mp3";
        this.bgmBadEndPath = "music/bad_end/A_Weight_Left_Behind.mp3";

        this.bgmAudio = null;
        this.currentBgmPath = null;

        this.alarmAudio = new Audio(this.sfxAlarmPath);
        this.quakeAudio = new Audio(this.sfxQuakePath);
        this.fallingAudio = new Audio(this.sfxFallingPath);

        this.alarmAudio.volume = 1.0;
        this.quakeAudio.volume = 0.8;
        this.fallingAudio.volume = 0.8;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.unlocked = true;

        if (this.bgmAudio && this.bgmAudio.paused && !this.isMuted) {
            this.bgmAudio.play().catch(() => {});
        }
    }

    startActAudioSequence(actId) {
        if (this.isMuted) return;
        this.init();

        if (actId === 1 || actId === 4) {
            // 第一幕與第四幕：地震警報發布！先啟動警報音效，播完後才進入主音樂！
            this.playEarthquakeAlarmThenBGM(actId);
        } else {
            // 其他幕次：直接啟動主音樂 (BGM)
            this.playActBGM(actId);
            if (actId === 2 || actId === 3) {
                this.playFallingSFX();
            }
        }
    }

    stopAlarm() {
        if (this.alarmAudio) {
            this.alarmAudio.pause();
            this.alarmAudio.currentTime = 0;
            this.alarmAudio.onended = null;
        }
        if (this.quakeAudio) {
            this.quakeAudio.pause();
            this.quakeAudio.currentTime = 0;
        }
    }

    playEarthquakeAlarmThenBGM(actId) {
        if (this.isMuted) return;
        this.init();

        // 1. 停止目前任何背景音樂與舊警報
        this.stopBGM();
        this.stopAlarm();

        // 2. 重置台灣國家級警報音效
        this.alarmAudio.currentTime = 0;
        this.alarmAudio.volume = 1.0;

        // 3. 設定警報播完 (onended) 後，自動接續啟動主音樂 (BGM)
        this.alarmAudio.onended = () => {
            console.log("台灣國家級警報播畢 ➔ 自動接續啟動主音樂！");
            if (!this.isMuted) {
                this.playActBGM(actId);
            }
        };

        // 4. 同時伴隨地震轟隆背景音
        try {
            this.quakeAudio.currentTime = 0;
            this.quakeAudio.volume = 0.7;
            this.quakeAudio.play().catch(() => {});
        } catch(e) {}

        // 5. 播放國家級警報音效
        const p = this.alarmAudio.play();
        if (p !== undefined) {
            p.then(() => {
                console.log("台灣國家級警報響起中 (播畢後將自動進入主音樂)...");
            }).catch(err => {
                console.log("警報播放受權限限制，等待玩家點擊頁面...", err);
            });
        }
    }

    playAlarm() {
        if (this.isMuted) return;
        this.init();
        try {
            this.alarmAudio.currentTime = 0;
            this.alarmAudio.volume = 1.0;
            const playPromise = this.alarmAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("國家級警報播放中...");
                }).catch(err => {
                    console.log('Alarm play blocked by browser policy, fallback synth:', err);
                    this.playSynthAlarm();
                });
            }
        } catch(e) {
            this.playSynthAlarm();
        }
    }

    playQuakeRumble() {
        if (this.isMuted) return;
        this.init();
        try {
            this.quakeAudio.currentTime = 0;
            this.quakeAudio.volume = 0.8;
            this.quakeAudio.play().catch(() => this.playSynthQuake());
        } catch(e) {
            this.playSynthQuake();
        }
    }

    playFallingSFX() {
        if (this.isMuted) return;
        this.init();
        try {
            this.fallingAudio.currentTime = 0;
            this.fallingAudio.volume = 0.8;
            this.fallingAudio.play().catch(() => {});
        } catch(e) {}
    }

    playActBGM(actId) {
        if (this.isMuted) return;
        this.stopAlarm(); // 切換主音樂時確保關閉舊警報

        // Acts 1~3: randomly pick from folder 1 or folder 2 if not currently playing
        if (actId <= 3) {
            if (!this.currentBgmPath || !this.bgmTracks.includes(this.currentBgmPath)) {
                const randomTrack = this.bgmTracks[Math.floor(Math.random() * this.bgmTracks.length)];
                this.playBGM(randomTrack);
            } else if (!this.bgmAudio || this.bgmAudio.paused) {
                this.playBGM(this.currentBgmPath);
            }
        } else if (actId === 4 || actId === 5) {
            if (!this.bgmAudio || this.bgmAudio.paused) {
                const randomTrack = this.bgmTracks[Math.floor(Math.random() * this.bgmTracks.length)];
                this.playBGM(randomTrack);
            }
        }
    }

    playEndingBGM(isGoodEnding) {
        const targetBgm = isGoodEnding ? this.bgmGoodEndPath : this.bgmBadEndPath;
        this.playBGM(targetBgm, true);
    }

    playBGM(src, loop = true) {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }
        this.currentBgmPath = src;
        this.bgmAudio = new Audio(src);
        this.bgmAudio.loop = loop;
        this.bgmAudio.volume = 0.55;
        if (!this.isMuted) {
            this.bgmAudio.play().catch(e => console.log('BGM play error:', e));
        }
    }

    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
            this.currentBgmPath = null;
        }
    }

    // Web Audio API Synthesizer Fallbacks & Micro FX
    playSynthAlarm() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.15].forEach(delay => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now + delay);
            osc.frequency.exponentialRampToValueAtTime(1760, now + delay + 0.1);
            gain.gain.setValueAtTime(0.15, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.1);
        });
    }

    playSynthQuake() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 1.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, now);
        filter.frequency.linearRampToValueAtTime(60, now + 1.5);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    }

    playCardFlip() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playRewindSound() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
        osc.frequency.exponentialRampToValueAtTime(200, now + 1.5);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.7);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
    }

    playVictoryChime() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.15, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.6);
        });
    }

    playBuzzer() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            if (this.bgmAudio) this.bgmAudio.pause();
            this.alarmAudio.pause();
            this.quakeAudio.pause();
            this.fallingAudio.pause();
        } else {
            if (this.bgmAudio) this.bgmAudio.play().catch(() => {});
        }
        return this.isMuted;
    }
}

const audio = new AudioEngine();

// Avatars retain original colors and opacity; no color-based background removal.

// --- Helper to ensure HTML5 <ruby> tags around all <rt> Zhuyin annotations ---
function formatRubyZhuyin(str) {
    if (!str) return '';
    let clean = str.replace(/<ruby>\s*([^<>]+?)\s*<rt>/gi, '$1<rt>')
                   .replace(/<\/rt>\s*<\/ruby>/gi, '</rt>');
    return clean.replace(/([^>\s])<rt>([^<]+)<\/rt>/gi, '<ruby>$1<rt>$2</rt></ruby>');
}

// --- 50-CARD RAW DATASET FROM USER JSON ---
const RAW_STAGE_DATASET = {
  "1": [
    { "card_id": "S1_01", "name": "趴掩穩住", "result_type": "正解", "action": "就地趴下降低重心，鑽入堅固木課桌下，雙手死死扣住桌腳。", "feedback": "成功防禦落物！課桌未移位，吊扇砸在走廊空地，人員毫髮無傷。" },
    { "card_id": "S1_02", "name": "奪門而出", "result_type": "大失敗", "action": "推開椅子，在劇烈晃動中朝教室外走廊狂奔。", "feedback": "暴露於掉落物路徑！在走廊被高速墜落的鐵製吊扇重擊砸趴。" },
    { "card_id": "S1_03", "name": "書包頂頭", "result_type": "失敗", "action": "雙手將書包頂在頭頂，站在走道中間等待晃動停止。", "feedback": "重心過高被晃倒，薄弱書包根本無法抵擋重型金屬吊扇衝擊。" },
    { "card_id": "S1_04", "name": "只躲不抓", "result_type": "失敗", "action": "鑽進課桌底下，但雙手只顧死命摀住耳朵閉眼狂叫。", "feedback": "缺少「穩住」動作！課桌因橫搖滑開移位，身體重新暴露在外被砸傷。" },
    { "card_id": "S1_05", "name": "衝向講台", "result_type": "失敗", "action": "離開座位，衝到黑板與木製講台下方縮成一團。", "feedback": "黑板與講台周遭有懸掛螢幕與投影幕，面臨更大砸傷倒塌風險。" },
    { "card_id": "S1_06", "name": "黃金三角", "result_type": "大失敗", "action": "刻意不鑽桌底，蹲坐在排滿書本的大鐵櫃旁邊等待空間。", "feedback": "致命迷思！重型鐵櫃受震直接前傾倒塌，將人員徹底壓扁。" },
    { "card_id": "S1_07", "name": "原地嚇傻", "result_type": "失敗", "action": "呆坐在原座位的椅子上，雙手抱胸縮成一團。", "feedback": "完全缺乏堅固掩體，輕鋼架天花板掉落直接砸中頭頸部位。" },
    { "card_id": "S1_08", "name": "門口推擠", "result_type": "大失敗", "action": "爭相搶著從前門逃出，在教室狹小門口互相推擠拉扯。", "feedback": "門口爆發踩踏跌倒，前門被卡死，多人受傷喪失避難先機。" },
    { "card_id": "S1_09", "name": "牆角低蹲", "result_type": "次佳", "action": "離課桌太遠，迅速緊靠承重牆角低蹲，雙手緊扣後頸。", "feedback": "雖無掩體，但成功壓低重心並護住致命脆弱部位，僅受輕微擦傷。" },
    { "card_id": "S1_10", "name": "先收書包", "result_type": "失敗", "action": "急忙把桌上的文具與外套塞進書包拉好拉鍊才準備躲。", "feedback": "浪費黃金反應前五秒，還未躲入桌底即被第一波掉落雜物擊中。" }
  ],
  "2": [
    { "card_id": "S2_01", "name": "貼柱低抱", "result_type": "正解", "action": "遠離折疊桌與懸掛物，靠緊結構主柱跪姿低蹲，雙手死扣後頸。", "feedback": "精準避險！投影機砸毀折疊桌，但柱旁無落物，全員毫髮無傷。" },
    { "card_id": "S2_02", "name": "鑽折疊桌", "result_type": "大失敗", "action": "一群人全部擠進長條折疊桌下方，抓住金屬細桌腳。", "feedback": "投影機重砸桌面，折疊桌瞬間變形塌陷，桌下學生遭嚴重夾傷。" },
    { "card_id": "S2_03", "name": "起身推門", "result_type": "大失敗", "action": "大喊開門防卡死，冒險在劇烈晃動中站起衝向大門推門。", "feedback": "劇震中站立直接被甩飛摔斷手臂，回彈的門板重擊額頭。" },
    { "card_id": "S2_04", "name": "圓凳頂頭", "result_type": "失敗", "action": "抓起現場的圓形塑膠椅頂在頭上，站在教室中央等待。", "feedback": "塑膠凳不堪重擊碎裂，鋒利碎片直接割傷臉部與眼睛。" },
    { "card_id": "S2_05", "name": "趴地爬行", "result_type": "失敗", "action": "不敢站立，改用腹部貼地方式在地上匍匐爬向門口。", "feedback": "地面散落大量震碎的儀器零件與玻璃，雙手及膝蓋被大面積割傷。" },
    { "card_id": "S2_06", "name": "窗邊揮手", "result_type": "大失敗", "action": "衝到窗邊拉開窗簾，向操場方向大聲揮手大喊求救。", "feedback": "強震震爆大片窗戶玻璃，迎面造成嚴重刺割傷與墜樓危險。" },
    { "card_id": "S2_07", "name": "躲音響架", "result_type": "大失敗", "action": "鑽進綜合教室角落的大型金屬音響器材架下方躲避。", "feedback": "重型音箱連同金屬架劇烈傾倒，直接砸壓在避難者身上。" },
    { "card_id": "S2_08", "name": "伏臥內牆", "result_type": "次佳", "action": "緊貼沒有窗戶與懸掛物的無雜物實心內牆趴伏護頸。", "feedback": "避開了中央投影機墜落與碎玻璃噴濺，雖有落塵但無重大傷亡。" },
    { "card_id": "S2_09", "name": "滿場亂竄", "result_type": "大失敗", "action": "找不到桌子而驚慌失措，像無頭蒼蠅在教室各個角落奔跑。", "feedback": "失去平衡跌倒，撞倒旁邊的金屬樂器架引發連鎖砸傷。" },
    { "card_id": "S2_10", "name": "躲大鋼琴", "result_type": "大失敗", "action": "跑到綜合教室的直立大鋼琴側下方蹲著。", "feedback": "附帶滾輪的重型鋼琴劇烈滑移衝撞，將學生夾在牆壁與琴身之間。" }
  ],
  "3": [
    { "card_id": "S3_01", "name": "閉嘴快走", "result_type": "正解", "action": "捂嘴安靜不語、壓下恐慌，緊跟隊伍依序下樓，到操場再精準通報。", "feedback": "杜絕恐慌傳染！隊伍順暢無阻下樓，操場指揮組立刻掌握受困位置出動。" },
    { "card_id": "S3_02", "name": "喊要塌了", "result_type": "大失敗", "action": "聽見哭聲失控狂喊「大樓要塌了」，從後方壓推前面同學狂奔。", "feedback": "引發骨牌式踩踏！前方多人滾落階梯受傷骨折，疏散動線完全受阻。" },
    { "card_id": "S3_03", "name": "逆向救人", "result_type": "大失敗", "action": "聽見哭聲以為是好友，拋下隊伍轉身逆向往綜合教室大樓衝。", "feedback": "盲目逆流造成嚴重動線對撞，兩方雙雙跌下樓梯受重傷。" },
    { "card_id": "S3_04", "name": "停步看戲", "result_type": "失敗", "action": "整隊停在樓梯轉角平台不走，抬頭指指點點討論是誰在哭。", "feedback": "造成樓梯間極度回堵，全隊陷入懸空梯間的極高危險區域。" },
    { "card_id": "S3_05", "name": "翻越扶手", "result_type": "大失敗", "action": "嫌下樓太慢，單手翻越樓梯矮扶手想直接跳落下一層平台。", "feedback": "高度落差造成腳踝粉碎性骨折，躺在路中央成為阻礙。" },
    { "card_id": "S3_06", "name": "腿軟坐地", "result_type": "失敗", "action": "被哭聲嚇哭，雙腿發軟直接在階梯正中央坐下不肯走動。", "feedback": "直接化身路中央大型路障，後方視線受阻的同學煞車不及接連絆倒。" },
    { "card_id": "S3_07", "name": "大聲喝止", "result_type": "次佳", "action": "六年級班長轉身大喊：「不要吵！往前走，不要推！」", "feedback": "雖短暫打破「不語」，但有效壓制四年級躁動，未引發嚴重踩踏。" },
    { "card_id": "S3_08", "name": "肉身擋推", "result_type": "次佳", "action": "高年級排尾同學張開雙臂形成人牆，死死擋住四年級的推擠衝勢。", "feedback": "自己承受推擠造成手臂挫傷，但成功保全了前方下樓隊伍的穩定節奏。" },
    { "card_id": "S3_09", "name": "亂扔水壺", "result_type": "失敗", "action": "慌亂推擠中，隨手將沉重的金屬水壺與頭套亂扔在階梯上。", "feedback": "水壺沿階梯滾落，前方踩到的同學滑倒扭傷，造成局部摔傷。" },
    { "card_id": "S3_10", "name": "脫隊反鎖", "result_type": "大失敗", "action": "不敢繼續走樓梯，脫隊溜進旁邊的自然教室把門反鎖躲藏。", "feedback": "操場清點短少人員，迫使大人在餘震威脅下重返危樓逐間破門搜救。" }
  ],
  "4": [
    { "card_id": "S4_01", "name": "貼柱低蹲", "result_type": "正解", "action": "立即停步，緊貼走廊內側結構大柱蹲低，書包或頭套護頭。", "feedback": "避開外側落物區！屋瓦磁磚全墜落在走廊外，人員在柱旁毫髮無傷。" },
    { "card_id": "S4_02", "name": "衝出走廊", "result_type": "大失敗", "action": "直覺以為戶外空曠處安全，拔腿慌亂衝出走廊外側空地。", "feedback": "衝入垂直死亡落物區！遭校舍邊緣崩落的高空厚重屋瓦重擊砸趴。" },
    { "card_id": "S4_03", "name": "折返教室", "result_type": "大失敗", "action": "大喊「回教室躲桌子」，轉身逆向往剛才的一樓教室狂奔。", "feedback": "教室門已在劇震中卡住，逆向奔跑在走廊被震碎的壁掛廣播箱擊中。" },
    { "card_id": "S4_04", "name": "躲窗台下", "result_type": "大失敗", "action": "整個人緊緊貼在一樓走廊整排大鋁門窗下方的矮牆邊蹲著。", "feedback": "致命迷思！6 級強震震爆整面玻璃，大量銳利碎玻璃如雨砸落造成重割傷。" },
    { "card_id": "S4_05", "name": "原地直立", "result_type": "失敗", "action": "站在走廊正中間雙手抱頭，直挺挺站著不動等待晃動過去。", "feedback": "未降低重心被上下劇震猛力甩倒在水泥地，額頭直接撞擊地面掛彩。" },
    { "card_id": "S4_06", "name": "蹲抱路中", "result_type": "次佳", "action": "來不及靠柱，直接在走廊正中央趴下蜷縮身軀死死護頭。", "feedback": "避開外側落瓦與直立跌倒，雖被震落的細小碎石劃傷，但無致命傷。" },
    { "card_id": "S4_07", "name": "推人搶位", "result_type": "大失敗", "action": "硬把已經靠在柱子邊的同學推開，自己搶佔柱邊避難空間。", "feedback": "推擠引發兩人雙雙失去平衡摔出走廊邊界，遭墜落磚瓦砸傷。" },
    { "card_id": "S4_08", "name": "趴地平躺", "result_type": "失敗", "action": "整個人肚子貼地大字形趴在走廊中央地面上。", "feedback": "受害暴露面積過大，遭震落的走廊吊扇螺絲與水泥塊砸傷背部。" },
    { "card_id": "S4_09", "name": "靠牆蜷縮", "result_type": "次佳", "action": "緊貼走廊內側無窗戶的實心牆壁，背對外側蜷縮抱頭。", "feedback": "避開了外側落石與玻璃雨，有效保護軀幹與頭部，順利撐過餘震。" },
    { "card_id": "S4_10", "name": "手扶外欄", "result_type": "大失敗", "action": "衝到走廊最外側邊緣，雙手抓住外側矮護欄探頭看天空。", "feedback": "將自己完全暴露於屋簷正下方，直接遭到屋頂墜落的瓦片擊中。" }
  ],
  "5": [
    { "card_id": "S5_01", "name": "嚴肅清點", "result_type": "正解", "action": "全員蹲下閉嘴，班長實名核對人數並清點導師，發現未到立刻通報。", "feedback": "清點精確！第一時間回報「導師受困二樓走廊」，搜救組火速救出導師。" },
    { "card_id": "S5_02", "name": "嬉鬧虛報", "result_type": "大失敗", "action": "把集合當下課推擠聊天，連看都沒看就對司令台高喊「全員到齊」。", "feedback": "搜救行動宣告結束，受傷導師被遺忘在坍塌危樓瓦礫下，釀成悲劇。" },
    { "card_id": "S5_03", "name": "只算同學", "result_type": "大失敗", "action": "認真清點全班學生人頭確定無缺，完全沒注意導師根本沒在場。", "feedback": "點名盲點！導師同樣是災民，漏報導致大人搜救隊未前往二樓走廊。" },
    { "card_id": "S5_04", "name": "四處遊蕩", "result_type": "大失敗", "action": "到了操場脫隊亂跑去找別班朋友聊天，打亂全校集結隊形。", "feedback": "全校隊形大亂，各班幹部無法精確清點人數，整體搜救部署嚴重延誤。" },
    { "card_id": "S5_05", "name": "自行返校", "result_type": "大失敗", "action": "發現導師沒跟上，兩名小學生未告知指揮官便自行跑回危樓救人。", "feedback": "嚴重違反災防紀律！學生被倒塌的走廊磚牆困在室內，徒增救援負擔。" },
    { "card_id": "S5_06", "name": "席地而坐", "result_type": "次佳", "action": "隊伍安靜坐下但未主動核對名冊，直到主任巡視詢問才發現缺導師。", "feedback": "雖稍微延誤了通報黃金時機，但隊伍保持肅靜，最終順利通報救援。" },
    { "card_id": "S5_07", "name": "默不作聲", "result_type": "失敗", "action": "私下發現老師沒走出來，但因為害羞害怕，不敢舉手報告校長。", "feedback": "關鍵情報卡在學生嘴裡，錯失前十分鐘黃金破門期，導師傷勢加重。" },
    { "card_id": "S5_08", "name": "借機玩球", "result_type": "大失敗", "action": "看到操場邊有散落的足球，跑去踢球玩耍徹底無視集結指令。", "feedback": "破壞集結秩序，被校長用大聲公嚴厲喝斥，清點工作陷入停滯。" },
    { "card_id": "S5_09", "name": "排頭互數", "result_type": "次佳", "action": "各排前後迅速報數核對，隊伍雖稍微喧鬧，但立刻察覺少了一人。", "feedback": "透過快速報數確認人數缺漏，及時向指揮中心反應，搜救組順利出動。" },
    { "card_id": "S5_10", "name": "原地躺平", "result_type": "失敗", "action": "覺得逃跑太累，直接大字形平躺在操場草地上閉目養神不理人。", "feedback": "影響班級動態確認，班長誤以為有人昏厥引發虛驚，延遲真實通報。" }
  ]
};

// --- RANDOM CARD DRAW ENGINE (Select 3 cards from pool of 10, guaranteed 1 正解) ---
function drawStageCards(stageId) {
    const rawList = RAW_STAGE_DATASET[stageId.toString()] || [];
    if (!rawList.length) return [];

    const correctCards = rawList.filter(c => c.result_type === "正解");
    const otherCards = rawList.filter(c => c.result_type !== "正解");

    // Always pick 1 correct card
    const pickedCorrect = correctCards[Math.floor(Math.random() * correctCards.length)] || rawList[0];

    // Pick 2 random cards from the remaining 9 cards
    const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5);
    const pickedOthers = shuffledOthers.slice(0, 2);

    // Combine and randomly shuffle position of the 3 cards
    const drawnHand = [pickedCorrect, ...pickedOthers].sort(() => Math.random() - 0.5);

    return drawnHand.map(card => {
        const isCorrect = (card.result_type === "正解");
        
        let badgeText = "【錯誤連鎖決策】";
        if (card.result_type === "正解") badgeText = "【時空逆轉法則】";
        else if (card.result_type === "次佳") badgeText = "【次佳避難策略】";
        else if (card.result_type === "失敗") badgeText = "【延誤避難決策】";
        else if (card.result_type === "大失敗") badgeText = "【致命迷思決策】";

        let damage = 0;
        if (card.result_type === "次佳") damage = 4;
        else if (card.result_type === "失敗") damage = 10;
        else if (card.result_type === "大失敗") damage = 18;

        return {
            cardId: card.card_id,
            isCorrect: isCorrect,
            resultType: card.result_type,
            title: `【${card.name}】`,
            badge: badgeText,
            desc: card.action,
            damage: damage,
            outcomeImage: isCorrect ? `assets/outcomes/act${stageId}_safe.webp` : `assets/outcomes/act${stageId}_wrong.webp`,
            rewindStory: card.feedback,
            wrongStory: card.feedback,
            consequence: card.feedback
        };
    });
}

// --- 5 ACTS SCRIPT DATA ---
const ACTS_DATA = [
    {
        actId: 1,
        actName: "第一幕・普通教室・警報驟響",
        phaseName: "主震初期 (0～60秒)",
        bgImage: "assets/scenes/act1_classroom.webp",
        speakerName: "教導主任",
        speakerAvatar: "assets/avatars/avatar_dean.webp?v=original-colors-1",
        speakerEmotion: "【驚慌極限】",
        initialDialogue: "「嗶嗶——！所有人注意！這是國家級警報！地震！強震來了！」",
        initialStory: `<p><strong>【第<rt>ㄉㄧˋ</rt>一<rt>ㄧ</rt>幕<rt>ㄇㄨˋ</rt>：普<rt>ㄆㄨˇ</rt>通<rt>ㄊㄨㄥ</rt>教<rt>ㄐㄧㄠˋ</rt>室<rt>ㄕˋ</rt>・警<rt>ㄐㄧㄥˇ</rt>報<rt>ㄅㄠˋ</rt>驟<rt>ㄗㄡˋ</rt>響<rt>ㄒㄧㄤˇ</rt>】</strong></p><p>上<rt>ㄕㄤˋ</rt>課<rt>ㄎㄜˋ</rt>鐘<rt>ㄓㄨㄥ</rt>聲<rt>ㄕㄥ</rt>剛<rt>ㄍㄤ</rt>響<rt>ㄒㄧㄤˇ</rt>起<rt>ㄑㄧˇ</rt>，防<rt>ㄈㄤˊ</rt>災<rt>ㄗㄞ</rt>警<rt>ㄐㄧㄥˇ</rt>報<rt>ㄅㄠˋ</rt>無<rt>ㄨˊ</rt>預<rt>ㄩˋ</rt>警<rt>ㄐㄧㄥˇ</rt>尖<rt>ㄐㄧㄢ</rt>叫<rt>ㄐㄧㄠˋ</rt>！整<rt>ㄓㄥˇ</rt>座<rt>ㄗㄨㄛˋ</rt>校<rt>ㄒㄧㄠˋ</rt>舍<rt>ㄕㄜˋ</rt>開<rt>ㄎㄞ</rt>始<rt>ㄕˇ</rt>劇<rt>ㄐㄩˋ</rt>烈<rt>ㄌㄧㄝˋ</rt>左右<rt>ㄗㄨㄛˇㄧㄡˋ</rt>晃<rt>ㄏㄨㄤˇ</rt>動<rt>ㄉㄨㄥˋ</rt>。</p><p>走<rt>ㄗㄡˇ</rt>廊<rt>ㄌㄤˊ</rt>天<rt>ㄊㄧㄢ</rt>花<rt>ㄏㄨㄚ</rt>板<rt>ㄅㄢˇ</rt>上<rt>ㄕㄤˋ</rt>懸<rt>ㄒㄩㄢˊ</rt>掛<rt>ㄍㄨㄚˋ</rt>的<rt>ㄉㄜ</rt><strong>重<rt>ㄓㄨㄥˋ</rt>型<rt>ㄒㄧㄥˊ</rt>鐵<rt>ㄊㄧㄝˇ</rt>製<rt>ㄓˋ</rt>大<rt>ㄉㄚˋ</rt>吊<rt>ㄉㄧㄠ</rt>扇<rt>ㄕㄢˋ</rt>金<rt>ㄐㄧㄣ</rt>屬<rt>ㄕㄨˇ</rt>螺<rt>ㄌㄨㄛˊ</rt>絲<rt>ㄙ</rt>鬆<rt>ㄙㄨㄥ</rt>脫<rt>ㄊㄨㄛ</rt></strong>，正<rt>ㄓㄥˋ</rt>在<rt>ㄗㄞˋ</rt>劇<rt>ㄐㄩˋ</rt>烈<rt>ㄌㄧㄝˋ</rt>搖<rt>ㄧㄠˊ</rt>晃<rt>ㄏㄨㄤˇ</rt>中<rt>ㄓㄨㄥ</rt>應<rt>ㄧㄥ</rt>聲<rt>ㄕㄥ</rt>斷<rt>ㄉㄨㄢˋ</rt>裂<rt>ㄌㄧㄝˋ</rt>！</p>`,
        record: {
            error: "警報大作，學生慌亂起身往外衝，在走廊被震落的鐵製大吊扇砸中肩膀與背部重傷。",
            cause: "1. 慌亂逃生陷阱：主震搖晃當下盲目逃跑易失去平衡摔倒，且走廊為重型落物危險區。 2. 忽略趴掩穩住：未就地尋找堅固課桌防護頭頸。",
            rule: "主震搖晃時切勿慌亂奔跑，立即就地「趴下、掩護、穩住」，雙手緊扣課桌腳保護頭頸。"
        }
    },
    {
        actId: 2,
        actName: "第二幕・專科教室・掉落危機",
        phaseName: "主震中期 (搖晃高峰)",
        bgImage: "assets/scenes/act2_lab.webp",
        speakerName: "阿凱同學",
        speakerAvatar: "assets/avatars/avatar_student.webp?v=original-colors-1",
        speakerEmotion: "【極度恐慌】",
        initialDialogue: "「哇啊！這間教室沒有木課桌！只有塑膠折疊桌！要躲哪裡啊！？」",
        initialStory: `<p><strong>【第<rt>ㄉㄧˋ</rt>二<rt>ㄦˋ</rt>幕<rt>ㄇㄨˋ</rt>：專<rt>ㄓㄨㄢ</rt>科<rt>ㄎㄜ</rt>教<rt>ㄐㄧㄠˋ</rt>室<rt>ㄕˋ</rt>・掉<rt>ㄉㄧㄠˋ</rt>落<rt>ㄌㄨㄛˋ</rt>危<rt>ㄨㄟ</rt>機<rt>ㄐㄧ</rt>】</strong></p><p>切<rt>ㄑㄧㄝ</rt>換<rt>ㄏㄨㄢˋ</rt>至<rt>ㄓˋ</rt>綜<rt>ㄗㄨㄥ</rt>合<rt>ㄏㄜˊ</rt>教<rt>ㄐㄧㄠˋ</rt>室<rt>ㄕˋ</rt>大<rt>ㄉㄚˋ</rt>樓<rt>ㄌㄡˊ</rt>。劇<rt>ㄐㄩˋ</rt>烈<rt>ㄌㄧㄝˋ</rt>橫<rt>ㄏㄥˊ</rt>搖<rt>ㄧㄠˊ</rt>進<rt>ㄐㄧㄣˋ</rt>入<rt>ㄖㄨˋ</rt>高<rt>ㄍㄠ</rt>峰<rt>ㄈㄥ</rt>，整<rt>ㄓㄥˇ</rt>棟<rt>ㄉㄨㄥˋ</rt>校<rt>ㄒㄧㄠˋ</rt>舍<rt>ㄕㄜˋ</rt>劇<rt>ㄐㄩˋ</rt>烈<rt>ㄌㄧㄝˋ</rt>震<rt>ㄓㄣˋ</rt>顫<rt>ㄓㄢˋ</rt>。</p><p>這<rt>ㄓㄜˋ</rt>間<rt>ㄐㄧㄢ</rt>教<rt>ㄐㄧㄠˋ</rt>室<rt>ㄕˋ</rt>沒<rt>ㄇㄟˊ</rt>有<rt>ㄧㄡˇ</rt>木<rt>ㄇㄨˋ</rt>製<rt>ㄓˋ</rt>個<rt>ㄍㄜˋ</rt>人<rt>ㄖㄣˊ</rt>課<rt>ㄎㄜˋ</rt>桌<rt>ㄓㄨㄛ</rt>，學<rt>ㄒㄩㄝˊ</rt>生<rt>ㄕㄥ</rt>看<rt>ㄎㄢˋ</rt>見<rt>ㄐㄧㄢˋ</rt>前<rt>ㄑㄧㄢˊ</rt>方<rt>ㄈㄤ</rt>擺<rt>ㄅㄞˇ</rt>著<rt>ㄓㄜ˙</rt>幾<rt>ㄐㄧˇ</rt>張<rt>ㄓㄨㄤ</rt>大<rt>ㄉㄚˋ</rt>型<rt>ㄒㄧㄥˊ</rt>長<rt>ㄔㄤˊ</rt>條<rt>ㄊㄧㄠˊ</rt>折<rt>ㄓㄜˊ</rt>疊<rt>ㄉㄧㄝˊ</rt>桌<rt>ㄓㄨㄛ</rt>，有<rt>ㄧㄡˇ</rt>人<rt>ㄖㄣˊ</rt>驚<rt>ㄐㄧㄥ</rt>慌<rt>ㄏㄨㄤ</rt>喊<rt>ㄏㄢˇ</rt>：「鑽<rt>ㄗㄨㄢ</rt>桌<rt>ㄓㄨㄛ</rt>底<rt>ㄉㄧˇ</rt>！」一<rt>ㄧ</rt>群<rt>ㄑㄩㄣˊ</rt>學<rt>ㄕㄥ</rt>立<rt>ㄌㄧˋ</rt>刻<rt>ㄎㄜˋ</rt>擠<rt>ㄐㄧˇ</rt>進<rt>ㄐㄧㄣˋ</rt>折<rt>ㄓㄜˊ</rt>疊<rt>ㄉㄧㄝˊ</rt>桌<rt>ㄓㄨㄛ</rt>下<rt>ㄒㄧㄚˋ</rt>方<rt>ㄈㄤ</rt>避<rt>ㄅㄧˋ</rt>難<rt>ㄋㄢˋ</rt>。</p><p>劇<rt>ㄐㄩˋ</rt>烈<rt>ㄌㄧㄝˋ</rt>搖<rt>ㄧㄠˊ</rt>晃<rt>ㄏㄨㄤˇ</rt>中<rt>ㄓㄨㄥ</rt>，天<rt>ㄊㄧㄢ</rt>花<rt>ㄏㄨㄚ</rt>板<rt>ㄅㄢˇ</rt>懸<rt>ㄒㄩㄢˊ</rt>掛<rt>ㄍㄨㄚˋ</rt>的<rt>ㄉㄜ</rt><strong>重<rt>ㄓㄨㄥˋ</rt>型<rt>ㄒㄧㄥˊ</rt>投<rt>ㄊㄡˊ</rt>影<rt>ㄧㄥˇ</rt>機<rt>ㄐㄧ</rt>連<rt>ㄌㄧㄢˊ</rt>同<rt>ㄊㄨㄥˊ</rt>金<rt>ㄐㄧㄣ</rt>屬<rt>ㄕㄨˇ</rt>吊<rt>ㄉㄧㄠ</rt>架<rt>ㄐㄧㄚˋ</rt>應<rt>ㄧㄥ</rt>聲<rt>ㄕㄥ</rt>扯<rt>ㄔㄜˇ</rt>斷<rt>ㄉㄨㄢˋ</rt>墜<rt>ㄓㄨㄟˋ</rt>落<rt>ㄌㄨㄛˋ</rt></strong>，「轟」一<rt>ㄧ</rt>聲<rt>ㄕㄥ</rt>重<rt>ㄓㄨㄥˋ</rt>重<rt>ㄓㄨㄥˋ</rt>砸<rt>ㄗㄚˊ</rt>在<rt>ㄗㄞˋ</rt>折<rt>ㄓㄜˊ</rt>疊<rt>ㄉㄧㄝˊ</rt>桌<rt>ㄓㄨㄛ</rt>正<rt>ㄓㄥˋ</rt>中<rt>ㄓㄨㄥ</rt>央<rt>ㄧㄤ</rt>！折<rt>ㄓㄜˊ</rt>疊<rt>ㄉㄧㄝˊ</rt>桌<rt>ㄓㄨㄛ</rt>塌<rt>ㄊㄚ</rt>陷<rt>ㄒㄧㄢˋ</rt>將<rt>ㄐㄧㄤ</rt>躲<rt>ㄉㄨㄛˇ</rt>在<rt>ㄗㄞˋ</rt>下<rt>ㄒㄧㄚˋ</rt>方<rt>ㄈㄤ</rt>的<rt>ㄉㄜ</rt>數<rt>ㄕㄨˋ</rt>名<rt>ㄇㄧㄥˊ</rt>學<rt>ㄒㄩㄝˊ</rt>生<rt>ㄕㄥ</rt>夾<rt>ㄐㄧㄚˊ</rt>傷<rt>ㄕㄤ</rt>！</p>`,
        record: {
            error: "在無堅固課桌的專科教室，盲目躲進缺乏結構強度的折疊桌下方。",
            cause: "1. 折疊桌無防護力：折疊桌無法承受上方重物衝擊，被砸中時容易變形塌陷，反而形成致命夾傷陷阱。 2. 高空懸掛物死角：天花板投影機等重型設備正下方是極危險掉落區。",
            rule: "無堅固課桌時，應遠離懸掛設備、窗戶與折疊桌，迅速緊靠「建築主結構柱」或「實心內牆」，跪姿壓低身軀、雙手緊扣後頸。"
        }
    },
    {
        actId: 3,
        actName: "第三幕：樓梯疏散・恐慌傳染",
        phaseName: "主震停止撤離中 (向下逃生)",
        bgImage: "assets/scenes/act3_stairwell.webp",
        speakerName: "四年級阿凱",
        speakerAvatar: "assets/avatars/avatar_student.webp?v=original-colors-1",
        speakerEmotion: "【極度恐慌】",
        initialDialogue: "「綜合大樓傳來哭聲：『救命啊！門推不開！』大樓是不是要塌了！？快跑啊啊啊！」",
        initialStory: `<p><strong>【第<rt>ㄉㄧˋ</rt>三<rt>ㄙㄢ</rt>幕<rt>ㄇㄨˋ</rt>：樓<rt>ㄌㄡˊ</rt>梯<rt>ㄊㄧ</rt>疏<rt>ㄕㄨ</rt>散<rt>ㄙㄢˋ</rt>・恐<rt>ㄎㄨㄥˇ</rt>慌<rt>ㄏㄨㄤ</rt>傳<rt>ㄔㄨㄢˊ</rt>染<rt>ㄖㄢˇ</rt>】</strong></p><p>主<rt>ㄓㄨˇ</rt>震<rt>ㄓㄣˋ</rt>停<rt>ㄊㄧㄥˊ</rt>止<rt>ㄓˇ</rt>，警<rt>ㄐㄧㄥˇ</rt>報<rt>ㄅㄠˋ</rt>暫<rt>ㄗㄢˋ</rt>歇<rt>ㄒㄧㄝ</rt>。各<rt>ㄍㄜˋ</rt>班<rt>ㄅㄢ</rt>開<rt>ㄎㄞ</rt>始<rt>ㄕˇ</rt>走<rt>ㄗㄡˇ</rt>出<rt>ㄔㄨ</rt>教<rt>ㄐㄧㄠˋ</rt>室<rt>ㄕˋ</rt>，依<rt>ㄧ</rt>序<rt>ㄒㄩˋ</rt>順<rt>ㄕㄨㄣˋ</rt>著<rt>ㄓㄜ˙</rt>狹<rt>ㄒㄧㄚˊ</rt>窄<rt>ㄗㄞˇ</rt>樓<rt>ㄌㄡˊ</rt>梯<rt>ㄊㄧ</rt>往<rt>ㄨㄤˇ</rt>一<rt>ㄧ</rt>樓<rt>ㄌㄡˊ</rt>操<rt>ㄘㄠ</rt>場<rt>ㄘㄤˇ</rt>撤<rt>ㄔㄜˋ</rt>離<rt>ㄌㄧˊ</rt>。</p><p>此<rt>ㄙˇ</rt>時<rt>ㄕˊ</rt>，<strong>綜<rt>ㄗㄨㄥ</rt>合<rt>ㄏㄜˊ</rt>教<rt>ㄐㄧㄠˋ</rt>室<rt>ㄕˋ</rt>大<rt>ㄉㄚˋ</rt>樓<rt>ㄌㄡˊ</rt>傳<rt>ㄔㄨㄢˊ</rt>來<rt>ㄌㄞˊ</rt>同<rt>ㄊㄨㄥˊ</rt>伴<rt>ㄅㄢˋ</rt>的<rt>ㄉㄜ</rt>淒<rt>ㄑㄧ</rt>厲<rt>ㄌㄧˋ</rt>哭<rt>ㄎㄨ</rt>喊<rt>ㄏㄢˇ</rt>：「救<rt>ㄐㄧㄡˋ</rt>命<rt>ㄇㄧㄥˋ</rt>啊<rt>ㄚ</rt>！我<rt>ㄨㄛˇ</rt>被<rt>ㄅㄟˋ</rt>壓<rt>ㄧㄚ</rt>到<rt>ㄉㄠˋ</rt>了<rt>ㄌㄜ˙</rt>！門<rt>ㄇㄣˊ</rt>推<rt>ㄊㄨㄟ</rt>不<rt>ㄅㄨˋ</rt>開<rt>ㄎㄞ</rt>！」</strong></p><p>走<rt>ㄗㄡˇ</rt>在<rt>ㄗㄞˋ</rt>隊<rt>ㄉㄨㄟˋ</rt>伍<rt>ㄨˇ</rt>中<rt>ㄓㄨㄥ</rt>間<rt>ㄐㄧㄢ</rt>的<rt>ㄉㄜ</rt>四<rt>ㄙˋ</rt>年<rt>ㄋㄧㄢˊ</rt>級<rt>ㄐㄧˊ</rt>阿<rt>ㄚ</rt>凱<rt>ㄎㄞˇ</rt>聽<rt>ㄊㄧㄥ</rt>見<rt>ㄐㄧㄢˋ</rt>哭<rt>ㄎㄨ</rt>聲<rt>ㄕㄥ</rt>瞬<rt>ㄕㄨㄣˋ</rt>間<rt>ㄐㄧㄢ</rt>慌<rt>ㄏㄨㄤ</rt>了<rt>ㄌㄜ˙</rt>，大<rt>ㄉㄚˋ</rt>喊<rt>ㄏㄢˇ</rt>：「大<rt>ㄉㄚˋ</rt>樓<rt>ㄌㄡˊ</rt>要<rt>ㄧㄠˋ</rt>塌<rt>ㄊㄚ</rt>了<rt>ㄌㄜ˙</rt>！快<rt>ㄎㄨㄞˋ</rt>跑<rt>ㄆㄠˇ</rt>啊<rt>ㄚ</rt>！」並<rt>ㄅㄧㄥˋ</rt>失<rt>ㄕ</rt>控<rt>ㄎㄨㄥˋ</rt>往<rt>ㄨㄤˇ</rt>前<rt>ㄑㄧㄢˊ</rt>猛<rt>ㄇㄥˇ</rt>推<rt>ㄊㄨㄟ</rt>；前<rt>ㄑㄧㄢˊ</rt>方<rt>ㄈㄤ</rt>同<rt>ㄊㄨㄥˊ</rt>學<rt>ㄒㄩㄝˊ</rt>被<rt>ㄅㄟˋ</rt>推<rt>ㄊㄨㄟ</rt>得<rt>ㄉㄜ˙</rt>跌<rt>ㄉㄧㄝ</rt>倒<rt>ㄉㄠˇ</rt>，<strong>好<rt>ㄏㄠˇ</rt>幾<rt>ㄐㄧˇ</rt>個<rt>ㄍㄜ˙</rt>同<rt>ㄊㄨㄥˊ</rt>學<rt>ㄒㄩㄝˊ</rt>被<rt>ㄅㄟˋ</rt>踩<rt>ㄘㄞˇ</rt>傷<rt>ㄕㄤ</rt>骨<rt>ㄍㄨˇ</rt>折<rt>ㄓㄜˊ</rt></strong>！</p>`,
        record: {
            error: "聽見哭聲散布恐慌言論並向前推擠。",
            cause: "撤離時大喊大叫會引發恐慌蔓延，造成推擠踩踏。「不語」的真正目的是杜絕恐慌傳染，維持隊伍行進節奏，並確保聽得見指揮命令。",
            rule: "聽見災情保持安靜不語、壓下恐慌，緊跟隊伍依序下樓；抵達操場後第一時間向指揮官通報「綜合教室大樓有人受困」，由受訓大人前往搜救。"
        }
    },
    {
        actId: 4,
        actName: "第四幕：一樓走廊・強烈餘震",
        phaseName: "疏散半途無遮蔽危機",
        bgImage: "assets/scenes/act4_corridor.webp",
        speakerName: "帶隊老師",
        speakerAvatar: "assets/avatars/avatar_dean.webp?v=original-colors-1",
        speakerEmotion: "【緊急戒備】",
        initialDialogue: "「嗶嗶——！警報二度尖叫！6 級餘震爆發！前方學生以為衝到外面空地就安全，正拔腿狂衝！」",
        initialStory: `<p><strong>【第<rt>ㄉㄧˋ</rt>四<rt>ㄙˋ</rt>幕<rt>ㄇㄨˋ</rt>：一<rt>ㄧ</rt>樓<rt>ㄌㄡˊ</rt>走<rt>ㄗㄡˇ</rt>廊<rt>ㄌㄤˊ</rt>・強<rt>ㄑㄧㄤˊ</rt>烈<rt>ㄌㄧㄝˋ</rt>餘<rt>ㄩˊ</rt>震<rt>ㄓㄣˋ</rt>】</strong></p><p>隊<rt>ㄉㄨㄟˋ</rt>伍<rt>ㄨˇ</rt>剛<rt>ㄍㄤ</rt>走<rt>ㄗㄡˇ</rt>上<rt>ㄕㄤˋ</rt>一<rt>ㄧ</rt>樓<rt>ㄌㄡˊ</rt>走<rt>ㄗㄡˇ</rt>廊<rt>ㄌㄤˊ</rt>、準<rt>ㄓㄨㄣˇ</rt>備<rt>ㄅㄟˋ</rt>走<rt>ㄗㄡˇ</rt>出<rt>ㄔㄨ</rt>校<rt>ㄒㄧㄠˋ</rt>舍<rt>ㄕㄜˋ</rt>大<rt>ㄉㄚˋ</rt>門<rt>ㄇㄣˊ</rt>時<rt>ㄕˊ</rt>，警<rt>ㄐㄧㄥˇ</rt>報<rt>ㄅㄠˋ</rt>無<rt>ㄨˊ</rt>預<rt>ㄩˋ</rt>警<rt>ㄐㄧㄥˇ</rt>二<rt>ㄦˋ</rt>度<rt>ㄉㄨˋ</rt>尖<rt>ㄐㄧㄢ</rt>叫<rt>ㄐㄧㄠˋ</rt>！6 級<rt>ㄐㄧˊ</rt>強<rt>ㄑㄧㄤˊ</rt>烈<rt>ㄌㄧㄝˋ</rt>餘<rt>ㄩˊ</rt>震<rt>ㄓㄣˋ</rt>瞬<rt>ㄕㄨˋ</rt>間<rt>ㄐㄧㄢ</rt>爆<rt>ㄅㄠˋ</rt>發<rt>ㄈㄚ</rt>！</p><p>走<rt>ㄗㄡˇ</rt>在<rt>ㄗㄞˋ</rt>前<rt>ㄑㄧㄢˊ</rt>面<rt>ㄇㄧㄢˋ</rt>的<rt>ㄉㄜ</rt>學<rt>ㄒㄩㄝˊ</rt>生<rt>ㄕㄥ</rt>慌<rt>ㄏㄨㄤ</rt>了<rt>ㄌㄜ˙</rt>手<rt>ㄕㄡˇ</rt>腳<rt>ㄐㄧㄠˇ</rt>，直<rt>ㄓˊ</rt>覺<rt>ㄐㄧㄨㄝˊ</rt>以<rt>ㄧˇ</rt>為<rt>ㄨㄟˊ</rt>「衝<rt>ㄨㄥ</rt>出<rt>ㄔㄨ</rt>走<rt>ㄗㄡˇ</rt>廊<rt>ㄌㄤˊ</rt>就<rt>ㄐㄧㄡˋ</rt>安<rt>ㄢ</rt>全<rt>ㄑㄨㄢˊ</rt>了<rt>ㄌㄜ˙</rt>」，拔<rt>ㄅㄚˊ</rt>腿<rt>ㄊㄨㄟˇ</rt>往<rt>ㄨㄞˋ</rt>面<rt>ㄇㄧㄢˋ</rt>空<rt>ㄎㄨㄥ</rt>地<rt>ㄉㄧˋ</rt>衝<rt>ㄨㄥ</rt>去<rt>ㄑㄩˋ</rt>。</p><p>強<rt>ㄑㄧㄤˊ</rt>震<rt>ㄓㄣˋ</rt>瞬<rt>ㄕㄨˋ</rt>間<rt>ㄐㄧㄢ</rt>震<rt>ㄓㄣˋ</rt>裂<rt>ㄌㄧㄝˋ</rt>校<rt>ㄒㄧㄠˋ</rt>舍<rt>ㄕㄜˋ</rt>斜<rt>ㄒㄧㄝˊ</rt>屋<rt>ㄨ</rt>頂<rt>ㄉㄧㄥˇ</rt>邊<rt>ㄅㄧㄢ</rt>緣<rt>ㄩㄢˊ</rt>，<strong>大<rt>ㄉㄚˋ</rt>量<rt>ㄌㄧㄤˋ</rt>厚<rt>ㄏㄡˋ</rt>重<rt>ㄓㄨㄥˋ</rt>的<rt>ㄉㄜ</rt>屋<rt>ㄨ</rt>瓦<rt>ㄨㄚˇ</rt>與<rt>ㄩˇ</rt>磁<rt>ㄘˊ</rt>磚<rt>ㄓㄨㄢ</rt>崩<rt>ㄅㄥ</rt>落<rt>ㄌㄨㄛˋ</rt>砸<rt>ㄗㄚˊ</rt>下<rt>ㄒㄧㄚˋ</rt></strong>，衝<rt>ㄨㄥ</rt>出<rt>ㄔㄨ</rt>走<rt>ㄗㄡˇ</rt>廊<rt>ㄌㄤˊ</rt>的<rt>ㄉㄜ</rt>學<rt>ㄒㄩㄝˊ</rt>生<rt>ㄕㄥ</rt>當<rt>ㄉㄤ</rt>場<rt>ㄔㄤˇ</rt>被<rt>ㄅㄟˋ</rt>砸<rt>ㄗㄚˊ</rt>倒<rt>ㄉㄠˇ</rt>重<rt>ㄓㄨㄥˋ</rt>傷<rt>ㄕㄤ</rt>！</p>`,
        record: {
            error: "劇震發生時慌亂衝出走廊外。",
            cause: "1. 迷思破除：走出走廊的建築物外緣與外牆正下方，正是磁磚、斜屋頂瓦片垂直崩落的「致命落物區」，絕非安全空曠處。 2. 走廊防護原則：疏散途中警報再響，不可盲目衝向戶外；應立即停下腳步，在走廊內側貼近大柱子蹲低、用隨身物品保護頭頸部。",
            rule: "停下腳步，在走廊內側貼近大柱子蹲低、用隨身物品（書包/防災頭套）保護頭頸部，等待晃動停止。"
        }
    },
    {
        actId: 5,
        actName: "第五幕：操場集結・疏散點名",
        phaseName: "最後一哩回報危機",
        bgImage: "assets/scenes/act5_playground.webp",
        speakerName: "指揮官（校長）",
        speakerAvatar: "assets/avatars/avatar_principal.webp?v=original-colors-1",
        speakerEmotion: "【嚴肅指揮】",
        initialDialogue: "「各班注意！到達草地迅速坐下！各班幹部立刻進行實名清點，精確回報！」",
        initialStory: `<p><strong>【第<rt>ㄉㄧˋ</rt>五<rt>ㄨˇ</rt>幕<rt>ㄇㄨˋ</rt>：操<rt>ㄘㄠ</rt>場<rt>ㄔㄤˇ</rt>集<rt>ㄐㄧˊ</rt>結<rt>ㄐㄧㄝˊ</rt>・疏<rt>ㄕㄨ</rt>散<rt>ㄙㄢˋ</rt>點<rt>ㄉㄧㄢˇ</rt>名<rt>ㄇㄧㄥˊ</rt>】</strong></p><p>餘<rt>ㄩˊ</rt>震<rt>ㄓㄣˋ</rt>停<rt>ㄊㄧㄥˊ</rt>止<rt>ㄓˇ</rt>後<rt>ㄏㄡˋ</rt>，隊<rt>ㄉㄨㄟˋ</rt>伍<rt>ㄨˇ</rt>終<rt>ㄓㄨㄥ</rt>於<rt>ㄩˊ</rt>陸<rt>ㄌㄨˋ</rt>續<rt>ㄒㄩˋ</rt>抵<rt>ㄉㄧˇ</rt>達<rt>ㄉㄚˊ</rt>操<rt>ㄘㄠ</rt>場<rt>ㄔㄤˇ</rt>中<rt>ㄓㄨㄥ</rt>央<rt>ㄧㄤ</rt>的<rt>ㄉㄜ</rt>安<rt>ㄢ</rt>全<rt>ㄑㄨㄢˊ</rt>避<rt>ㄅㄧˋ</rt>難<rt>ㄋㄢˋ</rt>區<rt>ㄑㄩ</rt>。</p><p>到了空<rt>ㄎㄨㄥ</rt>曠<rt>ㄎㄨㄤˋ</rt>草<rt>ㄘㄠˇ</rt>地<rt>ㄉㄧˋ</rt>，班<rt>ㄅㄢ</rt>長<rt>ㄓㄨㄤ</rt>沒<rt>ㄇㄟˊ</rt>有<rt>ㄧㄡˇ</rt>認<rt>ㄖㄣˋ</rt>真<rt>ㄓㄣ</rt>核<rt>ㄏㄜˊ</rt>對<rt>ㄉㄨˋ</rt>人<rt>ㄖㄣˊ</rt>數<rt>ㄕㄨˋ</rt>，完<rt>ㄨㄢˊ</rt>全<rt>ㄑㄩㄢˊ</rt>沒<rt>ㄇㄟˊ</rt>人<rt>ㄖㄣˊ</rt>注<rt>ㄓㄨˋ</rt>意<rt>ㄧˋ</rt>到<rt>ㄉㄠˋ</rt><strong>四<rt>ㄙˋ</rt>年<rt>ㄋㄧㄢˊ</rt>級<rt>ㄐㄧˊ</rt>導<rt>ㄉㄠˇ</rt>師<rt>ㄕ</rt>在<rt>ㄗㄞˋ</rt>二<rt>ㄦˋ</rt>樓<rt>ㄌㄡˊ</rt>走<rt>ㄗㄡˇ</rt>廊<rt>ㄌㄤˊ</rt>腳<rt>ㄐㄧㄠˇ</rt>踝<rt>ㄋㄧㄡˇ</rt>傷<rt>ㄕㄤ</rt>跌<rt>ㄉㄧㄝ</rt>倒<rt>ㄉㄠˇ</rt>，根<rt>ㄍㄣ</rt>本<rt>ㄅㄣˇ</rt>沒<rt>ㄇㄟˊ</rt>有<rt>ㄧㄡˇ</rt>跟<rt>ㄍㄣ</rt>著<rt>ㄓㄜ˙</rt>隊<rt>ㄉㄨㄟˋ</rt>伍<rt>ㄨˇ</rt>走<rt>ㄗㄡˇ</rt>出<rt>ㄔㄨ</rt>來<rt>ㄌㄞˊ</rt></strong>！</p><p>校<rt>ㄒㄧㄠˋ</rt>長<rt>ㄓㄨㄤ</rt>在<rt>ㄗㄞˋ</rt>司<rt>ㄙ</rt>令<rt>ㄌㄧㄥˋ</rt>台<rt>ㄊㄞˊ</rt>催<rt>ㄘㄨㄟ</rt>促<rt>ㄘㄨˋ</rt>，班<rt>ㄅㄢ</rt>長<rt>ㄓㄨㄤ</rt>隨<rt>ㄙㄨㄟˊ</rt>便<rt>ㄅㄧㄢˋ</rt>看<rt>ㄎㄢˋ</rt>了<rt>ㄌㄜ˙</rt>一<rt>ㄧ</rt>眼<rt>ㄧㄢˇ</rt>，高<rt>ㄍㄠ</rt>聲<rt>ㄕㄥ</rt>回<rt>ㄏㄨㄟˊ</rt>報<rt>ㄅㄠˋ</rt>：「四<rt>ㄙˋ</rt>年<rt>ㄋㄧㄢˊ</rt>級<rt>ㄐㄧˊ</rt>全<rt>ㄑㄩㄢˊ</rt>員<rt>ㄩㄢˊ</rt>到<rt>ㄉㄠˋ</rt>齊<rt>ㄑㄧˊ</rt>！」受<rt>ㄕㄡˋ</rt>困<rt>ㄎㄨㄣˋ</rt>導<rt>ㄉㄠˇ</rt>師<rt>ㄕ</rt>未<rt>ㄨㄟˋ</rt>列<rt>ㄌㄧㄝˋ</rt>失<rt>ㄕ</rt>蹤<rt>ㄗㄨㄥ</rt>名<rt>ㄇㄧㄥˊ</rt>單<rt>ㄉㄢ</rt>，錯<rt>ㄘㄨㄛˋ</rt>失<rt>ㄕ</rt>黃<rt>ㄏㄨㄤˊ</rt>金<rt>ㄐㄧㄣ</rt>搜<rt>ㄙㄡ</rt>救<rt>ㄐㄧㄡˋ</rt>時<rt>ㄕˊ</rt>機<rt>ㄐㄧ</rt>。</p>`,
        record: {
            error: "抵達操場後嬉鬧分心，未落實精確點名與師生清點，虛報全員到齊。",
            cause: "1. 點名盲點：學生常以為點名只是算「學生人頭」，忽略了「帶隊師長也是清點的一員」。 2. 情報延誤致命：指揮中心完全仰賴各班回報指派搜救小組。一旦「誤報全員到齊」，搜救隊將不會前往該區域，受困者直接被遺忘在危樓內。",
            rule: "抵達操場後指引安靜排好，幹部必須在第一秒落實「實名清點」，同時清點導師與科任老師是否在場；一旦發現缺少任何人（包含師長），立刻舉手大聲向指揮官回報具體失蹤者與最後看見的位置。"
        }
    }
];

// --- GAME STATE ENGINE ---
class GameState {
    constructor() {
        this.currentActIndex = 0;
        this.loopCount = 1;
        this.totalSurvivors = 120;
        this.injuredCount = 0;
        this.rewindCount = 0;
        this.historyLogs = [];
        this.actChoices = [];
        this.storyStreamHTML = "";
    }

    reset() {
        this.currentActIndex = 0;
        this.loopCount = 1;
        this.totalSurvivors = 120;
        this.injuredCount = 0;
        this.rewindCount = 0;
        this.historyLogs = [];
        this.actChoices = [];
        this.storyStreamHTML = "";
    }

    getCurrentAct() {
        return ACTS_DATA[this.currentActIndex];
    }
}

const state = new GameState();

// --- DOM ELEMENTS ---
const elements = {
    audioUnlockBar: document.getElementById('audio-unlock-banner'),
    btnUnlockAudio: document.getElementById('btn-unlock-audio'),
    sceneName: document.getElementById('current-scene-name'),
    survivorCount: document.getElementById('survivor-count'),
    loopCount: document.getElementById('loop-count'),
    sceneBg: document.getElementById('scene-bg'),
    actBadge: document.getElementById('act-badge'),
    speakerAvatar: document.getElementById('speaker-avatar'),
    speakerNameTag: document.getElementById('speaker-name-tag'),
    speakerEmotionBadge: document.getElementById('speaker-emotion-badge'),
    speechText: document.getElementById('speech-text'),
    phaseBadge: document.getElementById('phase-badge'),
    storyNarrativeContainer: document.getElementById('story-narrative-container'),
    storyText: document.getElementById('story-text'),
    cardDeck: document.getElementById('card-deck'),
    quakeOverlay: document.getElementById('quake-overlay'),
    rewindPortal: document.getElementById('rewind-portal'),
    btnSound: document.getElementById('btn-sound'),
    btnLog: document.getElementById('btn-log'),
    btnRestart: document.getElementById('btn-restart'),
    modalLog: document.getElementById('modal-log'),
    btnCloseLog: document.getElementById('btn-close-log'),
    logHistoryList: document.getElementById('log-history-list'),
    modalSettlement: document.getElementById('modal-settlement'),
    settlementTitle: document.getElementById('settlement-title'),
    settlementBadge: document.getElementById('settlement-badge'),
    statSaved: document.getElementById('stat-saved'),
    statInjured: document.getElementById('stat-injured'),
    statRewinds: document.getElementById('stat-rewinds'),
    settlementMatrix: document.getElementById('settlement-matrix'),
    btnRestartGame: document.getElementById('btn-restart-game')
};

// Typewriter Effect Engine
let typewriterTimer = null;

function typeWriterEffect(element, text, speed = 25) {
    if (typewriterTimer) clearInterval(typewriterTimer);
    element.innerHTML = '';
    let i = 0;
    typewriterTimer = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
        }
    }, speed);
}

// Trigger Quake Shake
function triggerQuakeEffect(durationMs = 1500) {
    audio.playQuakeRumble();
    document.body.classList.add('shake-quake');
    setTimeout(() => {
        document.body.classList.remove('shake-quake');
    }, durationMs);
}

// Trigger Time Rewind FX Animation
function triggerRewindAnimation(callback) {
    audio.playRewindSound();
    elements.rewindPortal.classList.add('active');
    setTimeout(() => {
        if (callback) callback();
    }, 1200);
    setTimeout(() => {
        elements.rewindPortal.classList.remove('active');
    }, 1800);
}

// Update Top Status UI
function updateStatusUI() {
    const currentAct = state.getCurrentAct();
    elements.sceneName.textContent = currentAct.actName;
    elements.actBadge.textContent = `第 ${currentAct.actId} 幕 / 共 5 幕`;
    elements.phaseBadge.textContent = currentAct.phaseName;

    elements.survivorCount.textContent = `全校 120 人 | 傷亡 ${state.injuredCount} 人`;
    elements.survivorCount.className = state.injuredCount === 0 ? "value text-success" : "value text-danger";

    elements.loopCount.textContent = `迴圈 #${state.loopCount} (${state.rewindCount > 0 ? "時光逆轉中" : "時間順暢"})`;
}

// Render Scene
function renderScene() {
    const act = state.getCurrentAct();
    updateStatusUI();

    // 啟動地震警報與主音樂 Sequence（第一幕/第四幕：先響起國家級警報，播畢後進入主音樂；其他幕次：直接進主音樂）
    audio.startActAudioSequence(act.actId);

    if (act.actId === 1 || act.actId === 4) {
        triggerQuakeEffect(1200);
    }

    // Left Backdrop & Character Avatar
    elements.sceneBg.src = act.bgImage;
    elements.speakerAvatar.src = act.speakerAvatar;

    // Trigger Client-side Auto Background Removal


    elements.speakerNameTag.textContent = act.speakerName;
    elements.speakerEmotionBadge.textContent = act.speakerEmotion;

    // Typewriter Dialogue
    typeWriterEffect(elements.speechText, act.initialDialogue);

    // Flowing Cumulative Story Text Stream
    const actSectionHTML = `
        <div id="act-block-${act.actId}" class="act-story-block" style="border-bottom: 1px dashed rgba(255,255,255,0.15); padding-bottom: 20px; margin-bottom: 20px;">
            ${formatRubyZhuyin(act.initialStory)}
        </div>
    `;

    if (state.currentActIndex === 0) {
        state.storyStreamHTML = actSectionHTML;
    } else {
        state.storyStreamHTML += actSectionHTML;
    }

    elements.storyText.innerHTML = formatRubyZhuyin(state.storyStreamHTML);

    // 依據教師引導教學需求：轉換幕次時，滾動視窗停在該幕斷點開頭 (不直接滑到最下面)
    setTimeout(() => {
        const currentBlock = document.getElementById(`act-block-${act.actId}`);
        if (currentBlock) {
            elements.storyNarrativeContainer.scrollTop = currentBlock.offsetTop;
        } else {
            elements.storyNarrativeContainer.scrollTop = 0;
        }
    }, 50);

    // Add to History Log
    state.historyLogs.push({
        actName: act.actName,
        speaker: act.speakerName,
        dialogue: act.initialDialogue
    });

    // Populate Random 3-Card Hand from 10-Card Stage Pool
    renderCards(drawStageCards(act.actId));
}

// Render Card Deck
function renderCards(cards) {
    elements.cardDeck.innerHTML = '';
    cards.forEach((card, index) => {
        const cardElem = document.createElement('div');
        cardElem.className = 'card-item';
        cardElem.innerHTML = `
            <div class="card-title">${card.title}</div>
            <div class="card-desc">${card.desc}</div>
            <div class="card-action-btn">選擇此策略 ➔</div>
        `;

        cardElem.addEventListener('mouseenter', () => {
            audio.playCardFlip();
        });

        cardElem.addEventListener('click', () => {
            handleCardSelection(card, index);
        });

        elements.cardDeck.appendChild(cardElem);
    });
}

// Handle Card Choice Logic & Embed Outcome Result Illustration Card
function handleCardSelection(selectedCard, cardIndex) {
    const act = state.getCurrentAct();

    state.actChoices.push({
        actId: act.actId,
        actName: act.actName,
        selectedCardTitle: selectedCard.title,
        isCorrect: selectedCard.isCorrect,
        record: act.record,
        consequence: selectedCard.consequence
    });

    if (selectedCard.isCorrect) {
        state.rewindCount++;
        state.loopCount++;

        elements.cardDeck.innerHTML = `<div class="text-success" style="grid-column: span 3; text-align: center; font-weight: bold; font-size: 1rem; padding: 10px;">⚡【正 確 法 則 啟 動】發 動 時 光 逆 轉...</div>`;

        triggerRewindAnimation(() => {
            audio.playVictoryChime();

            // EMBED OUTCOME ILLUSTRATION CARD WITH IMAGE!
            const outcomeHTML = `
                <div class="outcome-story-card safe-border">
                    <span class="outcome-badge">【時光逆轉解鎖・第 ${act.actId} 幕斷點結局】</span>
                    <div class="outcome-img-frame">
                        <img src="${selectedCard.outcomeImage}" class="outcome-img" alt="Act Outcome Illustration">
                    </div>
                    <p class="outcome-text">${formatRubyZhuyin(selectedCard.rewindStory)}</p>
                </div>
            `;
            state.storyStreamHTML += outcomeHTML;
            elements.storyText.innerHTML = formatRubyZhuyin(state.storyStreamHTML);
            elements.storyNarrativeContainer.scrollTop = elements.storyNarrativeContainer.scrollHeight;

            elements.speechText.textContent = `「太好了！時間成功倒轉！無人受傷，防災秩序完整！」`;

            setTimeout(() => {
                advanceToNextAct();
            }, 2600);
        });

    } else {
        audio.playBuzzer();
        audio.playFallingSFX(); // Trigger falling/collapse sound on failure
        triggerQuakeEffect(1000);

        state.injuredCount += (act.actId === 5 ? 1 : 15);
        updateStatusUI();

        // EMBED OUTCOME ILLUSTRATION CARD WITH IMAGE!
        const outcomeHTML = `
            <div class="outcome-story-card wrong-border">
                <span class="outcome-badge">【無法逆轉・第 ${act.actId} 幕惡化推進斷點】</span>
                <div class="outcome-img-frame">
                    <img src="${selectedCard.outcomeImage}" class="outcome-img" alt="Act Outcome Illustration">
                </div>
                <p class="outcome-text">${formatRubyZhuyin(selectedCard.wrongStory)}</p>
                <p style="margin-top: 6px; color: #fca5a5; font-size: 0.85rem; font-weight: bold;">⚠️ 災難影響：${selectedCard.consequence}</p>
            </div>
        `;
        state.storyStreamHTML += outcomeHTML;
        elements.storyText.innerHTML = formatRubyZhuyin(state.storyStreamHTML);
        elements.storyNarrativeContainer.scrollTop = elements.storyNarrativeContainer.scrollHeight;

        elements.speechText.textContent = `「糟了！決策失誤造成連鎖傷亡！隊伍帶著傷亡陷入惡化...」`;

        elements.cardDeck.innerHTML = `<div class="text-danger" style="grid-column: span 3; text-align: center; font-weight: bold; font-size: 1rem; padding: 10px;">⚠️ 錯 誤 連 鎖 惡 化 中... 劇 情 帶 傷 進 入 下 一 幕！</div>`;

        setTimeout(() => {
            advanceToNextAct();
        }, 3000);
    }
}

function advanceToNextAct() {
    if (state.currentActIndex < ACTS_DATA.length - 1) {
        state.currentActIndex++;
        renderScene();
    } else {
        showSettlementModal();
    }
}

// Settlement Modal Report (Integrated with Ending BGM)
function showSettlementModal() {
    const isPerfect = (state.injuredCount === 0);
    const isWorst = (state.injuredCount > 30);

    // Play Ending Music: Good End vs Bad End
    audio.playEndingBGM(isPerfect);

    elements.settlementTitle.textContent = isPerfect ? "🎉 防災演練成功・完美通關報告" : "⚠️ 災難演練結算與反思檢討報告";
    
    if (isPerfect) {
        elements.settlementBadge.textContent = "TRUE HAPPY ENDING (全員平安)";
        elements.settlementBadge.className = "result-badge text-success";
        elements.settlementBadge.style.background = "rgba(16, 185, 129, 0.2)";
        elements.settlementBadge.style.border = "1px solid #10b981";
    } else if (isWorst) {
        elements.settlementBadge.textContent = "WORST BAD ENDING (重大災害疏失)";
        elements.settlementBadge.className = "result-badge text-danger";
        elements.settlementBadge.style.background = "rgba(239, 68, 68, 0.2)";
        elements.settlementBadge.style.border = "1px solid #ef4444";
    } else {
        elements.settlementBadge.textContent = "SURVIVAL ENDING (慘烈脫險)";
        elements.settlementBadge.className = "result-badge text-warning";
        elements.settlementBadge.style.background = "rgba(245, 158, 11, 0.2)";
        elements.settlementBadge.style.border = "1px solid #f59e0b";
    }

    elements.statSaved.textContent = state.totalSurvivors - state.injuredCount;
    elements.statInjured.textContent = state.injuredCount;
    elements.statRewinds.textContent = state.rewindCount;

    // Render Disaster Record Review Matrix (Organized strictly by Act Breakpoints 1~5 with enlarged text)
    let matrixHTML = '';
    ACTS_DATA.forEach((act, idx) => {
        const choice = state.actChoices[idx];
        const isCorrect = choice ? choice.isCorrect : true;

        matrixHTML += `
            <div class="disaster-review-card ${isCorrect ? 'card-safe' : 'card-danger'}">
                <div class="disaster-review-header">
                    <div class="disaster-act-title">
                        <span class="breakpoint-pill">📍 災難斷點 #${act.actId}</span>
                        <span class="act-name-lg">第 ${act.actId} 幕：${act.actName} (${act.phaseName})</span>
                    </div>
                    <span class="result-tag ${isCorrect ? 'tag-safe-lg' : 'tag-danger-lg'}">
                        ${isCorrect ? '✔️ 時空逆轉成功' : '⚠️ 錯誤連鎖惡化'}
                    </span>
                </div>

                <div class="disaster-review-body">
                    <div class="review-row choice-row">
                        <strong class="label-cyan">📌 玩家決策選項：</strong>
                        <span class="choice-title-lg">【${choice ? choice.selectedCardTitle : '未選擇'}】</span>
                    </div>
                    
                    <div class="review-row consequence-row">
                        <strong class="label-cyan">⚡ 決策影響與結果：</strong>
                        <span class="review-text-lg">${choice ? choice.consequence : '無紀錄'}</span>
                    </div>

                    <div class="review-box error-box-lg">
                        <div class="review-item-lg">
                            <strong class="label-red">❌ 關鍵錯誤行為：</strong>
                            <span class="text-content">${act.record.error}</span>
                        </div>
                        <div class="review-item-lg" style="margin-top: 8px;">
                            <strong class="label-yellow">🔍 災難檢討主因：</strong>
                            <span class="text-content">${act.record.cause}</span>
                        </div>
                    </div>

                    <div class="rule-box-lg">
                        <div class="review-item-lg">
                            <strong class="label-green">🛡️ 防災正確法則：</strong>
                            <span class="text-content-highlight">${act.record.rule}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    elements.settlementMatrix.innerHTML = matrixHTML;
    elements.modalSettlement.classList.remove('hidden');
}

// Log History Modal
function openLogModal() {
    elements.logHistoryList.innerHTML = '';
    state.historyLogs.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<strong>[${entry.actName}] ${entry.speaker}:</strong> ${entry.dialogue}`;
        elements.logHistoryList.appendChild(div);
    });
    elements.modalLog.classList.remove('hidden');
}

// EVENT LISTENERS & DIRECT FILE UNLOCK
document.addEventListener('DOMContentLoaded', () => {
    renderScene();

    const autoActivateAudio = () => {
        audio.init();
        const noticePill = document.getElementById('audio-start-notice');
        if (noticePill) noticePill.style.display = 'none';
        const act = state.getCurrentAct();
        if (act) {
            audio.startActAudioSequence(act.actId);
        }
    };

    ['click', 'pointerdown', 'keydown', 'touchstart'].forEach(evtType => {
        window.addEventListener(evtType, autoActivateAudio, { once: true });
    });

    elements.btnSound.addEventListener('click', (e) => {
        e.stopPropagation();
        const muted = audio.toggleMute();
        elements.btnSound.textContent = muted ? '🔇' : '🔊';
    });

    elements.btnLog.addEventListener('click', (e) => {
        e.stopPropagation();
        openLogModal();
    });

    elements.btnCloseLog.addEventListener('click', () => {
        elements.modalLog.classList.add('hidden');
    });

    elements.btnRestart.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm("確定要重頭開始避難演練嗎？")) {
            audio.stopBGM();
            state.reset();
            renderScene();
        }
    });

    elements.btnRestartGame.addEventListener('click', () => {
        elements.modalSettlement.classList.add('hidden');
        audio.stopBGM();
        state.reset();
        renderScene();
    });
});
