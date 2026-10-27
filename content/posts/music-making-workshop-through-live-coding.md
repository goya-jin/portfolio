{"title":"Music making workshop through Live coding","date":"2025-12-01","draft":false,"source":"Cargo","source_page_id":"F3607908150"}
---
## Using Strudel, Supercollider

<video controls playsinline preload="metadata" style="width:100%;max-height:75vh" poster="https://freight.cargo.site/w/600/q/75/i/J2687204948170279978103498357693/IMG_3629-2.jpg"><source src="https://freight.cargo.site/m/F2687204939057588405690979859389/IMG_3629-2.mov"><a href="https://freight.cargo.site/m/F2687204939057588405690979859389/IMG_3629-2.mov">영상 열기</a></video>

click to play

I became interested in music production about a year ago. What I love about music is how light the output feels — you just need one device to play it, and it instantly surrounds you like air. In contrast, commercial video has always felt heavy to me: you need cameras, lighting equipments, monitors, gear, sometimes actors too and an entire production process for anything to even exist. Maybe that’s why the lightness of music feels even more striking. To me, it feels closer to the essence of art.

To list a few things I learned through this experience: while standard composition software uses a linear timeline, tools like SuperCollider or Strudel utilize a circular timeline based on "cycles."

`setcps(1)` = Complete one rotation in one second.

Instead of following a long timeline linearly, it’s like creating a short, perfectly looping GIF. You pack the kick, bass, and effects into that one-second loop, and the circle keeps spinning. You don't place notes; you slice time to create rhythm. The concept is that “bd” (bass drum) uses the entire cycle, while “bd bd” divides the cycle into two equal parts.

Sometimes "sine" appears in the code. I was told this refers to a sine wave (ripple shape)—though my understanding slowed down at this point—but essentially, instead of plotting individual keyframes, it outputs the movement of a sine wave as sound.

My basic understanding is that you code a schedule onto a circular timeline, and based on that schedule, synthesizers are synthesized and samples are played in real-time.

SuperCollider offers scalability and connectivity with various physical instruments but is complex. Strudel, being web-based, is much more convenient, though it lacks the extensive expandability of SuperCollider. I tried both, but since I don't expect to produce on a professional level, Strudel offered quicker results. I initially tried the SuperCollider + VS Code setup, but it looked too difficult, so I switched tracks.

I pieced together snippets from the "Learn" tab, pasted them in, and played them—it sounded something like a construction site. But after refining it with GPT, learning what each function does, and tweaking things towards my desired direction (faster/slower BPM, toggling sounds, making things more regular/irregular), I managed to get slightly closer to the vibe I wanted.

However, since I still have zero understanding of instruments or music theory, it’s basically like a "cookie house" cobbled together from whatever materials were handed to me. If my interest holds, I'll give it another shot!

한 1년 전 쯤부터 음악 프로듀싱에 흥미를 가졌다. 음악은 우선 결과물적으로 가볍고 꼭 눈을 떼지 않더라도 내 주변에 공기처럼 존재할 수 있다는게 좋다. 영상이라는 무거운 분야를 오래 했다보니 더 그렇게 느끼는 걸 수도 있지만. 이번에 이거 하면서 배운 것들을 나열해보자면, 일반적인 작곡 프로그램은 선형적 타임라인을 가지는데, Supercollider나 Strudel은 사이클이라는 원형의 타임라인을 가진다고 한다.

setcps(1) = 1초에 한바퀴를 돌아라.

긴 타임라인을 선형적으로 따라가는게 아니라, 완벽하게 루핑되는 짧은 GIF를 만드는 것과 같다고 할 수 있다. 1초짜리 루프 안에 킥, 베이스, 이펙트를 다 넣고 그 원이 계속 돌아가는 것이다. 음을 찍어 넣는 것이 아니라, 시간을 쪼개서 리듬을 만든다. “bd” (=base drum)는 한 사이클을 통째로 쓰는 것, “bd bd”는 한 사이클을 2등분 하는 것, 그런 개념이라고 한다.

코드 중에 가끔 sine.이 나올때가 있는데, 이건 사인파(물결)모양으로 하는 거라고 해서, (여기부터 나는 이해가 느려지기 시작했으나) 일일히 키프레임을 찍는 것이 아니라 사인파 모양의 움직임을 사운드로 출력하게 되는 것이다. 코드로 원형의 타임라인에 시간표를 짜고, 그 시간표에 맞춰서 실시간으로 신디사이저를 합성하고 샘플을 재생하는 것이 내가 가볍게 이해해본 내용이다.

Supercollider는 좀 더 다양한 실물 악기들과 연동할 수 있고 확장성이 있는 대신에 좀 복잡하고, Strudel은 웹기반이라 훨씬 편리하지만 Supercollider만큼의 확장은 어렵다고 보면 된다고 한다. 두가지 다 실행해보았으나 이걸 통해 프로페셔널한 프로듀싱을 할 거라고 기대하지 않는 나에게는 strudel이 조금 더 빠르게 결과물을 보여주어서 초반에 supercollider 설치 + VSC 로 진행했으나 너무 어려워보여서 노선을 틀었다.

learn 탭에 있는 것들을 짜집어서 붙여넣고 재생해보니 공사장 소리-비슷한 것들이 났는데 지피티랑 같이 다듬고 각 함수들이 어떠한 역할을 하는지를 보고 원하는 방향(bpm을 빠르게-느리게, 특정 사운드를 키고 끄기, 조금 더 규칙적으로-불규칙적으로 등)을 조금씩 수정하니 원하는 느낌에 아주 조금은 가까워질 수 있었다. 다만 여전히 악기에 대한 이해가 전무하고 음악에 대한 지식도 없으니 주어진 것들을 가지고 얼기설기 붙여 만든 과자집에 가깝다고 할 수 있겠다. 흥미가 계속된다면 조금 더 해보도록 하겠다.

[https://supercollider.github.io](https://supercollider.github.io)

[https://strudel.cc/#JDogcygiW2JkIDxoaCBvaD5dKjIiKS5iYW5rKCJ0cjkwOSIpLmRlYyguNCk%3D](https://strudel.cc/#JDogcygiW2JkIDxoaCBvaD5dKjIiKS5iYW5rKCJ0cjkwOSIpLmRlYyguNCk%3D)

https://strudel.cc

![Artwork](https://freight.cargo.site/w/829/q/75/i/V2676664419447854095923583925181/cycle_representation-24efe2cc73b0b5e0ca32a158eed95162.png)

![Artwork](https://freight.cargo.site/w/600/q/75/i/F2676648050194544711615380470717/original_cba0d33b04c207e193e861764b48f8b3.png)
