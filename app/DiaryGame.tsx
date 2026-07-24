"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Segment = {
  id: string;
  text: string;
};

type Entry = {
  date: string;
  weekday: string;
  weather?: string;
  segments: Segment[];
};

type ReadingPage = {
  kind: "reading";
  id: string;
  chapter: string;
  margin: string;
  entries: Entry[];
};

type FrontPage = {
  kind: "front";
  id: string;
};

type DeductionPage = {
  kind: "deduction";
  id: string;
  chapter: string;
  number: string;
  question: string;
  instruction: string;
  requiredIds: string[];
  acceptedGroups: string[][];
  maxPins: number;
  conclusion: string;
  afterword: string;
  hints: string[];
};

type FinalPage = {
  kind: "final";
  id: "final";
  requiredIds: string[];
  acceptedGroups: string[][];
  maxPins: number;
  hints: string[];
};

type GamePage = FrontPage | ReadingPage | DeductionPage | FinalPage;

type SavedGame = {
  opened: boolean;
  currentPage: number;
  collected: string[];
  completed: string[];
  tags: Record<string, string>;
  hintLevel?: Record<string, number>;
  finalComplete: boolean;
};

const STORAGE_KEY = "last-three-pages-diary-v1";

const tagOptions = ["未分类", "称呼", "时间", "门锁", "离开计划", "异常措辞"];

const pages: GamePage[] = [
  {
    kind: "front",
    id: "front",
  },
  {
    kind: "reading",
    id: "voice-a",
    chapter: "第一册｜她如何说话",
    margin: "本页目标：摘录顾澄对弟弟和父亲的固定称呼。",
    entries: [
      {
        date: "2004年10月3日",
        weekday: "星期日",
        weather: "小雨",
        segments: [
          {
            id: "oct03-found",
            text: "新日记本的纸有一股潮味。妈妈说便宜本子都这样，晒两天就好了。",
          },
          {
            id: "voice-smallboat",
            text: "小泊偷看了第一页。我告诉他，在这里我只叫他“小船”，这样那个人就看不懂。",
          },
          {
            id: "oct03-drawing",
            text: "他在页角画了一条歪歪扭扭的船，还坚持说那是我。",
          },
          {
            id: "oct03-weather",
            text: "今天下雨。雨点敲窗户的时候，屋里听起来没那么空。",
          },
        ],
      },
      {
        date: "2004年10月4日",
        weekday: "星期一",
        weather: "阴",
        segments: [
          {
            id: "oct04-school",
            text: "语文老师说，写日记不能总用“他”代替名字，否则读的人会分不清。",
          },
          {
            id: "voice-thatman",
            text: "可我不想在这里写那个人的名字。写出来，好像他就也能走进这几页。",
          },
          {
            id: "oct04-mom",
            text: "妈妈把最后一块排骨夹给小船，自己说不饿。",
          },
          {
            id: "oct04-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "voice-b",
    chapter: "第一册｜她如何说话",
    margin: "本页目标：找到顾澄对取暖器的固定称呼，并留意她写时间的习惯。",
    entries: [
      {
        date: "2004年10月6日",
        weekday: "星期三",
        weather: "降温",
        segments: [
          {
            id: "voice-sun",
            text: "妈妈把“小太阳”搬出来了。它右边的网罩有点歪，开久了会有煤油味。",
          },
          {
            id: "oct06-warning",
            text: "我让小船离远一点，他偏要把脚贴过去烤袜子。",
          },
          {
            id: "oct06-mother",
            text: "妈妈今天咳了好久。她说只是厨房的油烟太大。",
          },
          {
            id: "oct06-weather",
            text: "今天下了十分钟的雨。",
          },
        ],
      },
      {
        date: "2004年10月8日",
        weekday: "星期五",
        weather: "晴",
        segments: [
          {
            id: "oct08-rule",
            text: "那个人在冰箱上贴了新的家规：十点四十以前关灯，电话响三声以内必须接。",
          },
          {
            id: "oct08-clock",
            text: "我还是喜欢把时间写成“十点四十”。冒号像两只盯着人的眼睛。",
          },
          {
            id: "oct08-bus",
            text: "放学的公交车晚了七分钟，小船在门口等得睡着了。",
          },
          {
            id: "oct08-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "voice-c",
    chapter: "第一册｜她如何说话",
    margin: "本页目标：继续熟悉顾澄的语气；暂时不用推测火灾。",
    entries: [
      {
        date: "2004年10月10日",
        weekday: "星期日",
        weather: "阴",
        segments: [
          {
            id: "oct10-noodle",
            text: "小船把面条剪成一小段一小段，说这样吃得快。妈妈笑了一下。",
          },
          {
            id: "oct10-quiet",
            text: "那个人进门以后，妈妈就不笑了。电视还开着，可我们谁也没有看。",
          },
          {
            id: "oct10-homework",
            text: "我替小船检查了数学。他把“离开”写成了“梨开”。",
          },
          {
            id: "oct10-weather",
            text: "今天没有下雨。",
          },
        ],
      },
      {
        date: "2004年10月12日",
        weekday: "星期二",
        weather: "大雨",
        segments: [
          {
            id: "oct12-power",
            text: "停电二十分钟。小船怕黑，我让他从卧室数七步到储物间，再数五步到柜子。",
          },
          {
            id: "oct12-game",
            text: "我说这只是闭眼走路的游戏。他问为什么每次都要从家里往外走。",
          },
          {
            id: "oct12-answer",
            text: "我没有回答。妈妈在黑暗里捏了一下我的手。",
          },
          {
            id: "oct12-weather",
            text: "今天下了很大的雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "voice-d",
    chapter: "第一册｜她如何说话",
    margin: "本页目标：摘录顾明海通常几点回家，这条证词以后还会使用。",
    entries: [
      {
        date: "2004年10月14日",
        weekday: "星期四",
        weather: "晴",
        segments: [
          {
            id: "father-late",
            text: "那个人从来不会在十一点以前回来。今天十点五十五听见钥匙声，妈妈还说他回来早了。",
          },
          {
            id: "oct14-key",
            text: "他的钥匙很多，走路时会在右边裤袋里撞在一起。",
          },
          {
            id: "oct14-smell",
            text: "小太阳开了一整晚，房间里都是那股呛人的味道。",
          },
          {
            id: "oct14-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "deduction",
    id: "voice",
    chapter: "页边推理一",
    number: "01",
    question: "哪三种称呼最能代表顾澄平常的写作习惯？",
    instruction:
      "从摘录中选出三句话。答案必须同时说明她怎样称呼弟弟、父亲和取暖器。",
    requiredIds: ["voice-smallboat", "voice-thatman", "voice-sun"],
    acceptedGroups: [
      ["voice-smallboat"],
      ["voice-thatman", "father-late", "oct10-quiet"],
      ["voice-sun", "oct14-smell"],
    ],
    maxPins: 3,
    conclusion:
      "顾澄称弟弟为“小船”，称父亲为“那个人”，称取暖器为“小太阳”。",
    afterword:
      "这些称呼并非偶然。它们在她的文字里反复出现，会成为辨认最后几页作者的依据。",
    hints: [
      "方向：不要选人物做过什么，只找顾澄给他们起的称呼。",
      "定位：答案分别在10月3日、10月4日和10月6日。",
    ],
  },
  {
    kind: "reading",
    id: "lock-a",
    chapter: "第二册｜门为什么打不开",
    margin: "本页目标：摘录锁舌朝向，以及方岚人在房内的直接证据。",
    entries: [
      {
        date: "2004年10月16日",
        weekday: "星期六",
        weather: "阴",
        segments: [
          {
            id: "lock-new",
            text: "那个人给西边卧室换了锁，说旧锁总是自己弹开。",
          },
          {
            id: "lock-bolt",
            text: "我蹲下看过，新的锁舌朝着走廊，插销也装在外面。房间里的人根本碰不到。",
          },
          {
            id: "oct16-question",
            text: "小船问，为什么卧室要像储藏室一样上锁。",
          },
          {
            id: "oct16-weather",
            text: "今天没有下雨。",
          },
        ],
      },
      {
        date: "2004年10月18日",
        weekday: "星期一",
        weather: "小雨",
        segments: [
          {
            id: "mom-knock",
            text: "凌晨一点，我听见妈妈从西边卧室里面敲了三下门。她很轻地叫了我的名字。",
          },
          {
            id: "oct18-hall",
            text: "那个人坐在走廊抽烟。他没有看我，只说妈妈需要安静。",
          },
          {
            id: "oct18-water",
            text: "我把水杯放在门口，第二天还在原处。",
          },
          {
            id: "oct18-weather",
            text: "今天下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "lock-b",
    chapter: "第二册｜门为什么打不开",
    margin: "本页目标：确认钥匙由谁保管，以及房内的人能否自行开门。",
    entries: [
      {
        date: "2004年10月20日",
        weekday: "星期三",
        weather: "晴",
        segments: [
          {
            id: "key-pocket",
            text: "西边卧室的钥匙没有挂在墙上。我看见它和车钥匙一起，收在那个人右边的裤袋里。",
          },
          {
            id: "oct20-copy",
            text: "妈妈以前配过一把，被他找到以后折断了。",
          },
          {
            id: "oct20-dinner",
            text: "晚饭只有三副碗筷。小船把自己的半碗饭留在了锅边。",
          },
          {
            id: "oct20-weather",
            text: "今天没有下雨。",
          },
        ],
      },
      {
        date: "2004年10月21日",
        weekday: "星期四",
        weather: "阴",
        segments: [
          {
            id: "brother-cry",
            text: "小船半夜哭了。他说妈妈就在房间里，为什么不开门。",
          },
          {
            id: "oct21-lie",
            text: "我骗他说妈妈睡着了。其实敲门声一直没有停。",
          },
          {
            id: "oct21-father",
            text: "那个人把电视声音开得很大。",
          },
          {
            id: "oct21-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "lock-c",
    chapter: "第二册｜门为什么打不开",
    margin: "本页目标：验证门是否可能从里面反锁；相近证据同样有效。",
    entries: [
      {
        date: "2004年10月23日",
        weekday: "星期六",
        weather: "小雨",
        segments: [
          {
            id: "door-inside",
            text: "趁家里没人，我从卧室里面试了一次。门关上以后，里面没有旋钮，也没有插销。",
          },
          {
            id: "oct23-chair",
            text: "我最后踩着椅子，从气窗爬了出来。手臂划了一道口子。",
          },
          {
            id: "oct23-note",
            text: "如果以后有人说门是从里面反锁的，那个人一定在撒谎。",
          },
          {
            id: "oct23-weather",
            text: "今天下雨。",
          },
        ],
      },
      {
        date: "2004年10月25日",
        weekday: "星期一",
        weather: "阴",
        segments: [
          {
            id: "oct25-diary",
            text: "日记被人翻过。我夹在十月十日那页的头发不见了。",
          },
          {
            id: "oct25-code",
            text: "从今天开始，真正重要的事要分开写。只要不是同一天，他就看不懂。",
          },
          {
            id: "oct25-mother",
            text: "妈妈让我不要再记。我说，不记下来才会真的没发生过。",
          },
          {
            id: "oct25-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "lock-d",
    chapter: "第二册｜门为什么打不开",
    margin: "本页目标：记录取暖器在争执中曾经发生过的危险。",
    entries: [
      {
        date: "2004年10月27日",
        weekday: "星期三",
        weather: "大风",
        segments: [
          {
            id: "heater-kick",
            text: "那个人发火时踢到了小太阳。它撞在窗帘旁边，火苗一下变成很高的蓝色。",
          },
          {
            id: "heater-warning",
            text: "妈妈立刻关掉开关，说再倒一次一定会着火。",
          },
          {
            id: "oct27-blame",
            text: "那个人却说，是她把危险的东西放错了地方。",
          },
          {
            id: "oct27-weather",
            text: "今天没有下雨，但风把窗户吹得一直响。",
          },
        ],
      },
    ],
  },
  {
    kind: "deduction",
    id: "lock",
    chapter: "页边推理二",
    number: "02",
    question: "西边卧室的门，是意外卡住的吗？",
    instruction:
      "选出三句话，分别证明锁的方向、房间里有人，以及钥匙由谁控制。",
    requiredIds: ["lock-bolt", "mom-knock", "key-pocket"],
    acceptedGroups: [
      ["lock-bolt", "door-inside", "oct23-note"],
      ["mom-knock", "brother-cry", "oct21-lie"],
      ["key-pocket", "oct20-copy"],
    ],
    maxPins: 3,
    conclusion:
      "不是。西边卧室只能从走廊上锁，方岚曾被关在里面，唯一的钥匙由顾明海随身保管。",
    afterword:
      "“门打不开”不是火灾后的偶然。至少从十月中旬起，它就是顾明海控制方岚的手段。",
    hints: [
      "方向：需要三类证据——门锁结构、房内动静、钥匙归属。",
      "定位：重点回看10月16日、10月18日和10月20日；10月21日、23日也有可替代证据。",
    ],
  },
  {
    kind: "reading",
    id: "leave-a",
    chapter: "第三册｜她们要去哪里",
    margin: "本页目标：摘录目的地和末班车出发时间。",
    entries: [
      {
        date: "2004年10月29日",
        weekday: "星期五",
        weather: "晴",
        segments: [
          {
            id: "haicheng",
            text: "妈妈问我海城现在冷不冷。我说靠海的地方也许比这里暖一点。",
          },
          {
            id: "oct29-aunt",
            text: "她提到一个我没见过的周阿姨，说到了以后不要叫错名字。",
          },
          {
            id: "oct29-smallboat",
            text: "小船在旁边背乘法表，完全没发现我们在说什么。",
          },
          {
            id: "oct29-weather",
            text: "今天没有下雨。",
          },
        ],
      },
      {
        date: "2004年11月1日",
        weekday: "星期一",
        weather: "阴",
        segments: [
          {
            id: "bus-time",
            text: "妈妈让我记住下午四点二十。那是去海城的最后一班车，错过就要再等一天。",
          },
          {
            id: "nov01-station",
            text: "从家走到车站要十八分钟，小船走得慢，至少要留半小时。",
          },
          {
            id: "nov01-platform",
            text: "车从三号站台开。妈妈让我不要在候车厅叫她。",
          },
          {
            id: "nov01-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "leave-b",
    chapter: "第三册｜她们要去哪里",
    margin: "本页目标：摘录同行人数；新名字和三张车票都能证明这是逃离计划。",
    entries: [
      {
        date: "2004年11月3日",
        weekday: "星期三",
        weather: "小雨",
        segments: [
          {
            id: "aliases",
            text: "妈妈给我们各写了一个新名字。她说上车以后，我姓周，小船姓方，她自己姓林。",
          },
          {
            id: "nov03-practice",
            text: "小船总把新名字忘掉。我们练了五遍，他一紧张还是说自己姓顾。",
          },
          {
            id: "nov03-photo",
            text: "妈妈把证件照剪得很小，缝进了外套内衬。",
          },
          {
            id: "nov03-weather",
            text: "今天下雨。",
          },
        ],
      },
      {
        date: "2004年11月5日",
        weekday: "星期五",
        weather: "晴",
        segments: [
          {
            id: "three-tickets",
            text: "三张车票已经买好了。妈妈一张，我一张，小船一张，没有那个人的。",
          },
          {
            id: "nov05-price",
            text: "票价一共九十六块，是妈妈卖掉金耳环换来的。",
          },
          {
            id: "nov05-hide",
            text: "她先把票压在米缸底下，又觉得那里太容易被找到。",
          },
          {
            id: "nov05-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "leave-c",
    chapter: "第三册｜她们要去哪里",
    margin: "本页目标：确认车票藏处与离开屋子的路线。",
    entries: [
      {
        date: "2004年11月8日",
        weekday: "星期一",
        weather: "阴",
        segments: [
          {
            id: "bag-tickets",
            text: "我把车票缝进小船旧书包的蓝色夹层。他从来不碰那一格，因为拉链会夹手。",
          },
          {
            id: "nov08-clothes",
            text: "妈妈只让我们各带两件衣服。东西太多会被发现。",
          },
          {
            id: "nov08-diary",
            text: "这本日记也要带走。它比衣服重要。",
          },
          {
            id: "nov08-weather",
            text: "今天没有下雨。",
          },
        ],
      },
      {
        date: "2004年11月11日",
        weekday: "星期四",
        weather: "小雨",
        segments: [
          {
            id: "storage-route",
            text: "小船终于记住了：进储物间，移开旧柜子，从维修口出去，下两层，到洗衣房后门。",
          },
          {
            id: "nov11-no-return",
            text: "我让他答应，如果我没有跟上，先去车站，不许回来找我。",
          },
          {
            id: "nov11-phone",
            text: "洗衣房外面的电话还能用，投两枚硬币就能打出去。",
          },
          {
            id: "nov11-weather",
            text: "今天下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "leave-d",
    chapter: "第三册｜她们要去哪里",
    margin: "本页目标：找到具体日期，并用顾明海的作息解释为何选择这一天。",
    entries: [
      {
        date: "2004年11月13日",
        weekday: "星期六",
        weather: "晴",
        segments: [
          {
            id: "friday-plan",
            text: "妈妈决定下个星期五走。那个人星期五总会和同事喝酒，十一点以后才回来。",
          },
          {
            id: "nov13-calendar",
            text: "我在挂历的十九号下面点了一颗很小的红点。",
          },
          {
            id: "nov13-promise",
            text: "妈妈说只要坐上四点二十的车，我们就再也不用背家规。",
          },
          {
            id: "nov13-weather",
            text: "今天没有下雨。",
          },
        ],
      },
      {
        date: "2004年11月15日",
        weekday: "星期一",
        weather: "阴",
        segments: [
          {
            id: "nov15-count",
            text: "还有四天。小船问四天以后是不是就算回家了。",
          },
          {
            id: "nov15-home",
            text: "我说，有妈妈在的地方才算家。他好像听懂了。",
          },
          {
            id: "nov15-fear",
            text: "我本来应该高兴，却一直觉得那个人已经知道。",
          },
          {
            id: "nov15-weather",
            text: "今天没有下雨。",
          },
        ],
      },
    ],
  },
  {
    kind: "deduction",
    id: "leave",
    chapter: "页边推理三",
    number: "03",
    question: "方岚和两个孩子准备何时离开？",
    instruction:
      "选出四句话，证明出发时间、同行人数、具体日期，以及这个时间为何安全。",
    requiredIds: ["bus-time", "three-tickets", "friday-plan", "father-late"],
    acceptedGroups: [
      ["bus-time", "nov13-promise"],
      ["three-tickets", "aliases", "bag-tickets"],
      ["friday-plan", "nov13-calendar", "nov15-count"],
      ["father-late", "friday-plan"],
    ],
    maxPins: 4,
    conclusion:
      "方岚准备在11月19日星期五，带顾澄和小泊乘下午四点二十的末班车离开。",
    afterword:
      "她们不是临时外出。新名字、三张票和逃生路线共同证明，这是一次经过长期准备的逃离。",
    hints: [
      "方向：答案要同时说明时间、人数、日期和为什么那时安全。",
      "定位：出发时间在11月1日，人数在11月5日前后，日期在11月13日；作息证词在10月14日。",
    ],
  },
  {
    kind: "reading",
    id: "last-a",
    chapter: "第四册｜十一月十八日",
    margin: "本页目标：摘录顾明海提前回家、方岚被带回卧室，以及取暖器发生的异常。",
    entries: [
      {
        date: "2004年11月18日",
        weekday: "星期四",
        weather: "暴雨",
        segments: [
          {
            id: "father-early",
            text: "那个人今天九点多就回来了。比平常早了将近两个小时。",
          },
          {
            id: "saw-haicheng",
            text: "他在妈妈外套里看见了写着“海城”的纸。妈妈说只是旧收据，他没有相信。",
          },
          {
            id: "mother-bedroom",
            text: "妈妈让我带小船去储物间。不管听见什么，都不要从柜子后面出来。",
          },
          {
            id: "nov18-key",
            text: "走廊上传来钥匙撞在一起的声音，接着是西边卧室关门的声音。",
          },
          {
            id: "nov18-heater",
            text: "小太阳还开着。那个人经过时踢了一脚，屋里一下全是煤油味。",
          },
          {
            id: "wish-no-rain",
            text: "今天下了很大的雨。我第一次希望明天不要下雨，雨会让四点二十的车晚点。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "last-b",
    chapter: "第五册｜最后三页",
    margin: "本页目标：逐个比较父亲、弟弟、取暖器的称呼是否改变。",
    entries: [
      {
        date: "2004年11月19日",
        weekday: "星期五",
        segments: [
          {
            id: "forged-calm",
            text: "我现在非常平静。之前写过的离开计划，都是我一个人的幻想。",
          },
          {
            id: "forged-father",
            text: "爸爸一直尽力照顾这个家，是我误会了他。",
          },
          {
            id: "forged-brother",
            text: "弟弟年纪还小，不知道我今晚准备做什么。",
          },
          {
            id: "forged-time",
            text: "22:40以后，他们都会睡着。到时不会有人阻止我。",
          },
        ],
      },
      {
        date: "2004年11月19日｜续",
        weekday: "星期五",
        segments: [
          {
            id: "forged-heater",
            text: "我会故意推倒客厅里的取暖器，让火烧到窗帘。",
          },
          {
            id: "forged-alone",
            text: "如果发生意外，那是我一个人的决定，与爸爸、妈妈和弟弟都没有关系。",
          },
          {
            id: "forged-leave",
            text: "我没有打算去海城，也没有买过车票。",
          },
          {
            id: "forged-sign",
            text: "顾澄，亲笔。",
          },
        ],
      },
    ],
  },
  {
    kind: "reading",
    id: "last-c",
    chapter: "第五册｜最后三页",
    margin: "本页目标：留意重复强调的句子，以及此前每篇都有、这里却缺少的内容。",
    entries: [
      {
        date: "2004年11月19日｜末页",
        weekday: "星期五",
        segments: [
          {
            id: "forged-final",
            text: "请相信上面写下的全部内容。",
          },
          {
            id: "forged-repeat",
            text: "这是我一个人的决定。",
          },
          {
            id: "forged-weather",
            text: "这一页没有像此前每篇日记一样记录天气。",
          },
        ],
      },
    ],
  },
  {
    kind: "deduction",
    id: "author",
    chapter: "页边推理四",
    number: "04",
    question: "最后三页还是顾澄写的吗？",
    instruction:
      "选择六条摘录：三条来自顾澄此前的固定称呼，三条来自最后三页中相互冲突的叫法。",
    requiredIds: [
      "voice-smallboat",
      "voice-thatman",
      "voice-sun",
      "forged-father",
      "forged-brother",
      "forged-heater",
    ],
    acceptedGroups: [
      ["voice-smallboat"],
      ["voice-thatman", "father-late", "oct10-quiet"],
      ["voice-sun", "oct14-smell", "heater-kick", "heater-warning"],
      ["forged-father"],
      ["forged-brother"],
      ["forged-heater"],
    ],
    maxPins: 6,
    conclusion:
      "不是。最后三页的作者知道顾澄家的事情，却不熟悉她最稳定的语言习惯。",
    afterword:
      "“爸爸、弟弟、取暖器”看似更正式，恰好暴露了模仿者。顾澄从未这样称呼他们。",
    hints: [
      "方向：把顾澄原来的三种称呼，与最后三页的新称呼逐一配对比较。",
      "定位：原称呼集中在10月3日至6日；新称呼都在11月19日的前两页。",
    ],
  },
  {
    kind: "final",
    id: "final",
    requiredIds: [
      "key-pocket",
      "mom-knock",
      "three-tickets",
      "father-early",
      "mother-bedroom",
      "forged-alone",
      "forged-leave",
    ],
    acceptedGroups: [
      ["key-pocket", "lock-bolt", "door-inside"],
      ["mom-knock", "brother-cry", "oct21-lie"],
      ["three-tickets", "aliases", "bag-tickets"],
      ["father-early"],
      ["mother-bedroom", "nov18-key"],
      ["forged-alone"],
      ["forged-leave"],
    ],
    maxPins: 7,
    hints: [
      "方向：最终结论只证明三件事——门锁由谁控制、三人是否准备离开、最后三页在替谁开脱。",
      "定位：从10月的门锁记录、11月5日前后的离开计划、11月18日和最后三页中选择证据。",
    ],
  },
];

function collectEntries() {
  return pages.flatMap((page) => (page.kind === "reading" ? page.entries : []));
}

const allEntries = collectEntries();

const segmentLookup = new Map<
  string,
  { segment: Segment; date: string; weekday: string }
>();

for (const entry of allEntries) {
  for (const segment of entry.segments) {
    segmentLookup.set(segment.id, {
      segment,
      date: entry.date,
      weekday: entry.weekday,
    });
  }
}

function isDeduction(page: GamePage): page is DeductionPage {
  return page.kind === "deduction";
}

function satisfiesEvidenceGroups(pinned: string[], groups: string[][]) {
  function matchGroup(groupIndex: number, used: Set<string>): boolean {
    if (groupIndex >= groups.length) return true;

    for (const id of groups[groupIndex]) {
      if (!pinned.includes(id) || used.has(id)) continue;

      const nextUsed = new Set(used);
      nextUsed.add(id);
      if (matchGroup(groupIndex + 1, nextUsed)) return true;
    }

    return false;
  }

  return matchGroup(0, new Set());
}

export default function DiaryGame() {
  const [opened, setOpened] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [collected, setCollected] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [pinned, setPinned] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [hintLevel, setHintLevel] = useState<Record<string, number>>({});
  const [finalComplete, setFinalComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [today, setToday] = useState("");

  const page = pages[currentPage] ?? pages[0];
  const activePuzzle =
    page.kind === "deduction" || page.kind === "final" ? page : null;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedGame;
        setOpened(Boolean(saved.opened));
        setCurrentPage(
          Math.max(0, Math.min(saved.currentPage ?? 0, pages.length - 1)),
        );
        setCollected(Array.isArray(saved.collected) ? saved.collected : []);
        setCompleted(Array.isArray(saved.completed) ? saved.completed : []);
        setTags(saved.tags ?? {});
        setHintLevel(saved.hintLevel ?? {});
        setFinalComplete(Boolean(saved.finalComplete));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setToday(
        new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date()),
      );
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const saved: SavedGame = {
      opened,
      currentPage,
      collected,
      completed,
      tags,
      hintLevel,
      finalComplete,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [
    opened,
    currentPage,
    collected,
    completed,
    tags,
    hintLevel,
    finalComplete,
    hydrated,
  ]);

  const canMoveForward =
    currentPage < pages.length - 1 &&
    (!isDeduction(page) || completed.includes(page.id));

  const goPrevious = useCallback(() => {
    setMessage("");
    setPinned([]);
    setDrawerOpen(false);
    setCurrentPage((value) => Math.max(0, value - 1));
  }, []);

  const goNext = useCallback(() => {
    if (!canMoveForward) return;
    setMessage("");
    setPinned([]);
    setDrawerOpen(false);
    setCurrentPage((value) => Math.min(pages.length - 1, value + 1));
  }, [canMoveForward]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const element = event.target as HTMLElement | null;
      if (
        element &&
        ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName)
      ) {
        return;
      }
      if (!opened) return;
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrevious, opened]);

  const progress = useMemo(
    () => Math.round(((currentPage + 1) / pages.length) * 100),
    [currentPage],
  );

  function toggleCollect(id: string) {
    const source = segmentLookup.get(id);
    if (!source) return;

    if (collected.includes(id)) {
      setCollected((items) => items.filter((item) => item !== id));
      setPinned((items) => items.filter((item) => item !== id));
      setMessage("已擦除这条摘录。");
      return;
    }

    setCollected((items) => [...items, id]);
    setTags((current) => ({ ...current, [id]: current[id] ?? "未分类" }));
    setMessage("已将这句话抄到页边摘录。");
  }

  function togglePin(id: string) {
    if (!activePuzzle) return;

    if (pinned.includes(id)) {
      setPinned((items) => items.filter((item) => item !== id));
      return;
    }

    if (pinned.length >= activePuzzle.maxPins) {
      setMessage(`这次推理只能使用 ${activePuzzle.maxPins} 条摘录。`);
      return;
    }

    setPinned((items) => [...items, id]);
    setMessage("");
  }

  function submitDeduction(puzzle: DeductionPage) {
    if (pinned.length !== puzzle.maxPins) {
      setMessage(`请先选满 ${puzzle.maxPins} 条摘录。`);
      return;
    }

    const correct = satisfiesEvidenceGroups(pinned, puzzle.acceptedGroups);
    if (!correct) {
      setMessage(
        "这些摘录仍缺少一种必要事实。相同含义的句子可以替代，不必逐字命中标准答案。",
      );
      return;
    }

    setCompleted((items) =>
      items.includes(puzzle.id) ? items : [...items, puzzle.id],
    );
    setMessage("推论成立。纸页右下角可以继续翻动了。");
    setDrawerOpen(false);
    setPinned([]);
  }

  function submitFinal() {
    const finalPage = pages.find(
      (candidate): candidate is FinalPage => candidate.kind === "final",
    );
    if (!finalPage) return;

    if (pinned.length !== finalPage.maxPins) {
      setMessage(`请先选满 ${finalPage.maxPins} 条摘录。`);
      return;
    }

    const correct = satisfiesEvidenceGroups(
      pinned,
      finalPage.acceptedGroups,
    );
    if (!correct) {
      setMessage(
        "这个结论仍有越过证据的地方。只保留能直接证明门锁、离开计划和伪造目的的原句。",
      );
      return;
    }

    setFinalComplete(true);
    setMessage("");
    setDrawerOpen(false);
    setPinned([]);
  }

  function revealHint(id: string, hints: string[]) {
    const next = Math.min((hintLevel[id] ?? 0) + 1, hints.length + 1);
    setHintLevel((current) => ({ ...current, [id]: next }));
  }

  function useCorrectEvidence(ids: string[]) {
    setCollected((items) => Array.from(new Set([...items, ...ids])));
    setTags((current) => {
      const next = { ...current };
      for (const id of ids) next[id] ??= "未分类";
      return next;
    });
    setPinned(ids);
    setDrawerOpen(false);
    setMessage("正确摘录已放入当前推理；你仍需要亲手确认并形成结论。");
  }

  function resetGame() {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    setOpened(false);
    setCurrentPage(0);
    setCollected([]);
    setCompleted([]);
    setTags({});
    setPinned([]);
    setDrawerOpen(false);
    setMessage("");
    setHintLevel({});
    setFinalComplete(false);
    setResetArmed(false);
  }

  if (!hydrated) {
    return (
      <main className="scene" aria-label="最后三页">
        <div className="loading-note">纸页正在晾干……</div>
      </main>
    );
  }

  if (!opened) {
    return (
      <main className="scene scene-cover" aria-label="最后三页游戏封面">
        <div className="rain rain-one" />
        <div className="rain rain-two" />
        <section className="closed-book" aria-labelledby="game-title">
          <div className="cover-wear cover-wear-one" />
          <div className="cover-wear cover-wear-two" />
          <p className="cover-owner">顾澄</p>
          <h1 id="game-title">最后三页</h1>
          <p className="cover-years">2004 · 10 · 03 —</p>
          <p className="cover-note">不是每一页日记，都由日记的主人写下。</p>
          <button
            className="open-book-button"
            type="button"
            onClick={() => setOpened(true)}
          >
            打开日记
          </button>
          <div className="cover-meta">
            <span>纯文字推理</span>
            <span>约 45–70 分钟</span>
            <span>自动保存</span>
          </div>
        </section>
        {(currentPage > 0 || collected.length > 0) && (
          <button className="reset-outside" type="button" onClick={resetGame}>
            {resetArmed ? "再次点击，清空全部阅读记录" : "从头阅读"}
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="scene" aria-label="日记阅读界面">
      <div className="rain rain-one" />
      <div className="rain rain-two" />

      <section className="book-stage">
        <div className="book-toolbar" aria-label="日记工具">
          <button
            type="button"
            onClick={() => setOpened(false)}
            aria-label="合上日记"
          >
            合上
          </button>
          <div className="reading-progress" aria-label={`阅读进度 ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <button
            type="button"
            className={drawerOpen ? "active" : ""}
            onClick={() => setDrawerOpen((value) => !value)}
            aria-expanded={drawerOpen}
            aria-controls="evidence-drawer"
          >
            页边摘录 <b>{collected.length}</b>
          </button>
        </div>

        <div className={`open-book page-${page.kind}`}>
          <div className="book-spine" aria-hidden="true" />
          <div className="paper-noise" aria-hidden="true" />

          {page.kind === "front" && (
            <Frontispiece
              onBegin={() => setCurrentPage(1)}
              collectedCount={collected.length}
            />
          )}

          {page.kind === "reading" && (
            <ReadingSpread
              page={page}
              collected={collected}
              onToggle={toggleCollect}
            />
          )}

          {page.kind === "deduction" && (
            <DeductionSpread
              page={page}
              completed={completed.includes(page.id)}
              pinned={pinned}
              onOpenDrawer={() => setDrawerOpen(true)}
              onSubmit={() => submitDeduction(page)}
              hintLevel={hintLevel[page.id] ?? 0}
              onHint={() => revealHint(page.id, page.hints)}
              onUseAnswer={() => useCorrectEvidence(page.requiredIds)}
            />
          )}

          {page.kind === "final" && (
            <FinalSpread
              page={page}
              complete={finalComplete}
              pinned={pinned}
              today={today}
              onOpenDrawer={() => setDrawerOpen(true)}
              onSubmit={submitFinal}
              hintLevel={hintLevel.final ?? 0}
              onHint={() => revealHint("final", page.hints)}
              onUseAnswer={() => useCorrectEvidence(page.requiredIds)}
            />
          )}

          {message && (
            <p className="page-message" role="status">
              {message}
            </p>
          )}

          {page.kind !== "front" && (
            <footer className="page-footer">
              <span>顾澄的日记</span>
              <span>
                {currentPage + 1} / {pages.length}
              </span>
            </footer>
          )}
        </div>

        {page.kind !== "front" && (
          <div className="page-controls" aria-label="翻页">
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentPage === 0}
              aria-label="上一页"
            >
              ← 上一页
            </button>
            <span>
              {isDeduction(page) && !completed.includes(page.id)
                ? "完成页边推理后继续"
                : page.kind === "final"
                  ? "日记到这里结束"
                  : "点击句子可摘录"}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!canMoveForward}
              aria-label="下一页"
            >
              下一页 →
            </button>
          </div>
        )}

        <EvidenceDrawer
          open={drawerOpen}
          collected={collected}
          tags={tags}
          pinned={pinned}
          maxPins={activePuzzle?.maxPins ?? 0}
          puzzleActive={Boolean(activePuzzle) && !finalComplete}
          onClose={() => setDrawerOpen(false)}
          onTogglePin={togglePin}
          onRemove={toggleCollect}
          onTag={(id, tag) =>
            setTags((current) => ({ ...current, [id]: tag }))
          }
        />
      </section>
    </main>
  );
}

function Frontispiece({
  onBegin,
  collectedCount,
}: {
  onBegin: () => void;
  collectedCount: number;
}) {
  return (
    <div className="frontispiece">
      <div className="front-left">
        <p className="found-stamp">拾得于：栖雨巷17号</p>
        <p className="found-date">封面潮湿，内页完整。末三页墨色较新。</p>
        <div className="owner-lines">
          <span>姓名：顾澄</span>
          <span>开始日期：2004年10月3日</span>
          <span>结束日期：未填写</span>
        </div>
        <p className="tiny-warning">请勿替日记的主人补写结局。</p>
      </div>
      <div className="front-right">
        <p className="handwritten-intro">
          如果你真的想知道发生过什么，
          <br />
          不要只读最后一页。
        </p>
        <div className="reading-rules">
          <p>阅读方法</p>
          <ol>
            <li>点击任何一句你认为重要的话，把它抄入页边摘录。</li>
            <li>前后翻页，比较时间、称呼和互相矛盾的说法。</li>
            <li>在推理页选择原文作为证据。结论不能超过证据。</li>
            <li>提示按“方向—日期—正确摘录”递进，第三层可直接使用答案。</li>
          </ol>
        </div>
        {collectedCount > 0 && (
          <p className="resume-note">上次留下了 {collectedCount} 条摘录。</p>
        )}
        <button className="begin-reading" type="button" onClick={onBegin}>
          从十月三日开始
        </button>
      </div>
    </div>
  );
}

function ReadingSpread({
  page,
  collected,
  onToggle,
}: {
  page: ReadingPage;
  collected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="reading-spread">
      <p className="chapter-label">{page.chapter}</p>
      <p className="margin-instruction">{page.margin}</p>
      <div className="entries-grid">
        {page.entries.map((entry) => (
          <article className="diary-entry" key={`${page.id}-${entry.date}`}>
            <header>
              <time>{entry.date}</time>
              <span>{entry.weekday}</span>
            </header>
            <div className="entry-lines">
              {entry.segments.map((segment) => {
                const selected = collected.includes(segment.id);
                return (
                  <button
                    type="button"
                    className={`diary-sentence ${selected ? "selected" : ""}`}
                    key={segment.id}
                    onClick={() => onToggle(segment.id)}
                    aria-pressed={selected}
                    title={selected ? "点击擦除摘录" : "点击写入页边摘录"}
                  >
                    {segment.text}
                  </button>
                );
              })}
            </div>
            {entry.weather && (
              <p className="weather-mark" aria-hidden="true">
                {entry.weather}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function DeductionSpread({
  page,
  completed,
  pinned,
  onOpenDrawer,
  onSubmit,
  hintLevel,
  onHint,
  onUseAnswer,
}: {
  page: DeductionPage;
  completed: boolean;
  pinned: string[];
  onOpenDrawer: () => void;
  onSubmit: () => void;
  hintLevel: number;
  onHint: () => void;
  onUseAnswer: () => void;
}) {
  return (
    <div className="deduction-spread">
      <div className="deduction-left">
        <p className="deduction-number">{page.number}</p>
        <p className="chapter-label">{page.chapter}</p>
        <h2>{page.question}</h2>
        <p>{page.instruction}</p>
        <div className="pinned-lines">
          {Array.from({ length: page.maxPins }, (_, index) => {
            const source = segmentLookup.get(pinned[index]);
            return (
              <div
                className={source ? "pin-slot filled" : "pin-slot"}
                key={`${page.id}-slot-${index}`}
              >
                {source ? `“${source.segment.text}”` : `证据 ${index + 1}`}
              </div>
            );
          })}
        </div>
        <div className="deduction-actions">
          <button type="button" onClick={onOpenDrawer}>
            从页边摘录中选择
          </button>
          <button type="button" onClick={onSubmit} disabled={completed}>
            {completed ? "推论已成立" : "形成推论"}
          </button>
        </div>
      </div>
      <div className="deduction-right">
        {completed ? (
          <div className="conclusion-block">
            <p className="pencil-label">写在页边的结论</p>
            <blockquote>{page.conclusion}</blockquote>
            <p>{page.afterword}</p>
          </div>
        ) : (
          <div className="hint-block">
            <HintGuide
              hints={page.hints}
              hintLevel={hintLevel}
              answerIds={page.requiredIds}
              onHint={onHint}
              onUseAnswer={onUseAnswer}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FinalSpread({
  page,
  complete,
  pinned,
  today,
  onOpenDrawer,
  onSubmit,
  hintLevel,
  onHint,
  onUseAnswer,
}: {
  page: FinalPage;
  complete: boolean;
  pinned: string[];
  today: string;
  onOpenDrawer: () => void;
  onSubmit: () => void;
  hintLevel: number;
  onHint: () => void;
  onUseAnswer: () => void;
}) {
  if (complete) {
    return (
      <div className="final-complete">
        <div className="final-left">
          <p className="chapter-label">最终结论</p>
          <h2>最后三页不是顾澄写的。</h2>
          <p>
            方岚已经为自己和两个孩子准备了车票、新名字与离开路线。11月18日晚，顾明海提前回家并发现了海城的纸条；西边卧室随后被锁上，钥匙仍由他控制。
          </p>
          <p>
            日记不能证明火是被谁故意点燃的，却足以证明顾澄没有预谋纵火。最后三页否认车票、改写称呼，并反复强调“与爸爸无关”，其目的不是记录，而是制造一份替顾澄认罪的证词。
          </p>
          <p className="bounded-truth">
            能够被证据支持的真相是：顾明海在火灾后补写最后三页，试图把责任推给已经无法开口的女儿，并掩盖方岚曾被反锁以及三人准备逃离的事实。
          </p>
        </div>
        <div className="final-right">
          <p className="last-date">{today}</p>
          <p>今天没有下雨。</p>
          <p className="new-writing">谢谢你没有相信最后三页。</p>
          <p className="ending-note">
            这行字的墨迹还没有干。
            <br />
            但你确定刚才翻到这里时，纸上什么也没有。
          </p>
          <div className="end-mark">终</div>
        </div>
      </div>
    );
  }

  return (
    <div className="final-spread">
      <div className="final-question">
        <p className="chapter-label">最后的页边推理</p>
        <h2>这本日记能够证明什么？</h2>
        <p>
          选择七条原文，组成一个不超过证据的结论。不要把推测写成已经发生的事实。
        </p>
        <div className="final-pin-count">
          已选 {pinned.length} / {page.maxPins} 条摘录
        </div>
        <button type="button" onClick={onOpenDrawer}>
          选择最终证据
        </button>
        <button type="button" className="write-conclusion" onClick={onSubmit}>
          写下结论
        </button>
      </div>
      <div className="final-hints">
        <p className="pencil-label">页边提醒</p>
        <p>
          你不需要证明火是怎样点燃的。日记没有提供足够信息，声称知道反而是不诚实的。
        </p>
        <HintGuide
          hints={page.hints}
          hintLevel={hintLevel}
          answerIds={page.requiredIds}
          onHint={onHint}
          onUseAnswer={onUseAnswer}
        />
      </div>
    </div>
  );
}

function HintGuide({
  hints,
  hintLevel,
  answerIds,
  onHint,
  onUseAnswer,
}: {
  hints: string[];
  hintLevel: number;
  answerIds: string[];
  onHint: () => void;
  onUseAnswer: () => void;
}) {
  const answerVisible = hintLevel > hints.length;
  const labels = ["方向提示", "日期定位"];
  const nextLabel =
    hintLevel === 0
      ? "查看方向提示"
      : hintLevel === 1
        ? "查看日期定位"
        : hintLevel === 2
          ? "直接显示正确摘录"
          : "正确摘录已显示";

  return (
    <div className="hint-guide">
      <div className="hint-roadmap" aria-label="提示进度">
        <span className={hintLevel >= 1 ? "done" : "current"}>1 方向</span>
        <span className={hintLevel >= 2 ? "done" : hintLevel === 1 ? "current" : ""}>
          2 日期
        </span>
        <span className={answerVisible ? "done" : hintLevel === 2 ? "current" : ""}>
          3 答案
        </span>
      </div>

      {hints.slice(0, Math.min(hintLevel, hints.length)).map((hint, index) => (
        <div className="hint-stage" key={hint}>
          <span>{labels[index] ?? `提示 ${index + 1}`}</span>
          <p>{hint}</p>
        </div>
      ))}

      {hintLevel === hints.length && (
        <p className="answer-warning">
          如果仍然卡住，下一步会直接显示本题可用的正确摘录，不再只给方向。
        </p>
      )}

      {answerVisible && (
        <div className="answer-reveal">
          <p className="answer-title">本题正确摘录</p>
          {answerIds.map((id) => {
            const source = segmentLookup.get(id);
            if (!source) return null;
            return (
              <article className="answer-quote" key={id}>
                <time>{source.date}</time>
                <p>“{source.segment.text}”</p>
              </article>
            );
          })}
          <button
            type="button"
            className="use-answer-button"
            onClick={onUseAnswer}
          >
            将正确摘录放入当前推理
          </button>
          <p className="answer-note">此操作不会自动提交结论。</p>
        </div>
      )}

      <button
        type="button"
        className="hint-next-button"
        onClick={onHint}
        disabled={answerVisible}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function EvidenceDrawer({
  open,
  collected,
  tags,
  pinned,
  maxPins,
  puzzleActive,
  onClose,
  onTogglePin,
  onRemove,
  onTag,
}: {
  open: boolean;
  collected: string[];
  tags: Record<string, string>;
  pinned: string[];
  maxPins: number;
  puzzleActive: boolean;
  onClose: () => void;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  onTag: (id: string, tag: string) => void;
}) {
  return (
    <aside
      id="evidence-drawer"
      className={`evidence-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
      aria-label="页边摘录"
    >
      <header>
        <div>
          <p>页边摘录</p>
          <span>
            {puzzleActive
              ? `为当前推理选择 ${maxPins} 条`
              : "点击日记中的句子进行摘录"}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="收起页边摘录">
          收起
        </button>
      </header>

      {collected.length === 0 ? (
        <div className="empty-evidence">
          <p>这里还是空的。</p>
          <span>回到日记，点击任何你认为值得记录的句子。</span>
        </div>
      ) : (
        <div className="evidence-list">
          {collected.map((id) => {
            const source = segmentLookup.get(id);
            if (!source) return null;
            const isPinned = pinned.includes(id);
            const pinDisabled =
              puzzleActive && !isPinned && pinned.length >= maxPins;

            return (
              <article
                className={`evidence-card ${isPinned ? "pinned" : ""}`}
                key={id}
              >
                <div className="evidence-card-top">
                  <time>{source.date}</time>
                  <button type="button" onClick={() => onRemove(id)}>
                    擦除
                  </button>
                </div>
                <blockquote>“{source.segment.text}”</blockquote>
                <div className="evidence-card-bottom">
                  <label>
                    归类
                    <select
                      value={tags[id] ?? "未分类"}
                      onChange={(event) => onTag(id, event.target.value)}
                    >
                      {tagOptions.map((tag) => (
                        <option value={tag} key={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </label>
                  {puzzleActive && (
                    <button
                      type="button"
                      className={isPinned ? "use selected" : "use"}
                      onClick={() => onTogglePin(id)}
                      disabled={pinDisabled}
                      aria-pressed={isPinned}
                    >
                      {isPinned ? "已用于推理" : "用于推理"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
