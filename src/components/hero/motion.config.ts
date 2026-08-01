/**
 * Toate constantele coregrafiei hero-ului, intr-un singur loc.
 * Valorile de timp sunt in secunde, t=0 = mount. Nu improviza valori in
 * componente — regleaza de aici.
 */

export const EASE = {
  /** expo out — intrarile mari (mana, liniile de H1) */
  expo: [0.16, 1, 0.3, 1],
  /** in-out — underline-ul desenat */
  inOut: [0.65, 0, 0.35, 1],
} as const

export const TIMELINE = {
  mana: { delay: 0.15, durata: 1.4 },
  ecran: {
    wash: 0.55,
    antet: 0.75,
    titlu: 0.9,
    carduri: 1.05,
    cardStagger: 0.08,
    upcoming: 1.35,
    taburi: 1.5,
  },
  nori: { departare: 0.9, mijloc: 1.15, prim: 1.6 },
  nav: { logo: 2.1, linkuri: 2.15, actiuni: 2.3 },
  copy: {
    /** Desktop: exact 2.0s dupa startul mainii (0.15 + 2.00). */
    start: 2.15,
    /** Mobil astepti mai putin — textul e primul in flux (spec §6). */
    startMobil: 1.4,
    lineStagger: 0.12,
  },
  underline: 2.95,
  squiggle: 2.8,
  subtitlu: 3.05,
  ctaPrimar: 3.2,
  ctaSecundar: 3.3,
  pasari: { primul: 3.6, alDoilea: 8.5 },
  idle: 3.8,
  /** Parallax-ul de mouse nu raspunde deloc inainte de momentul asta. */
  interactiveAt: 2.0,
} as const

/**
 * Tabelul de straturi — sursa de adevar pentru z-index, adancime si blur
 * (spec §2). `depth` intra in formula de parallax de mouse, `scroll` in cea
 * de scroll.
 */
export const STRATURI = {
  fundal: { z: 0, depth: 0, scroll: 0.02 },
  noriDepartare: { z: 10, depth: 0.012, scroll: 0.1, blur: 2 },
  noriMijloc: { z: 20, depth: 0.026, scroll: 0.18 },
  pasari: { z: 30, depth: 0.04, scroll: 0.26 },
  text: { z: 40, depth: 0.014, scroll: 0.3 },
  doodles: { z: 50, depth: 0.055, scroll: 0.34 },
  telefon: { z: 60, depth: 0.075, scroll: 0.38 },
  norPrim: { z: 70, depth: 0.11, scroll: 0.5, blur: 6 },
} as const

/** Formula parallax: x = dx * depth * -140, y = dy * depth * -90 (px). */
export const PARALLAX = { ampX: -140, ampY: -90 } as const

/** Arcul comun al spring-urilor de mouse — fara el miscarea e robotica. */
export const ARC_MOUSE = { stiffness: 55, damping: 18, mass: 0.7 } as const

/**
 * Asset-ul cu mana + telefonul: mana-manechin din portelan alb mat, telefon
 * negru vertical cu ecranul spre camera, compozitie 3:4, fundal transparent.
 *
 * Candidatii se incearca in ordine. SVG-ul e ilustratia vectoriala livrata
 * cu proiectul; daca generezi ulterior varianta foto (WebP/PNG cu alpha,
 * 2400x3200), pune fisierul in /public/hero/ si adauga-l INAINTEA svg-ului
 * in lista — apoi recalibreaza ECRAN_RECT pe fotografia reala.
 * Daca niciun candidat nu se incarca, ramane silueta CSS.
 */
export const ASSETS = {
  mana: ['/hero/mana-telefon.svg'],
} as const

/** Cadrul rezervat pentru mana + telefon — raportul compozitiei (3:4). */
export const ASPECT_CADRU = '3 / 4'

/**
 * Unde sta ecranul DOM peste telefonul din imagine, in procente din cadrul
 * 3:4. Valorile sunt EXACTE pentru mana-telefon.svg (ecranul e desenat la
 * x=260 y=184 w=560 h=1182 in spatiul 1200x1600, colturi rx=72) — deci
 * calibrarea e prin constructie. Pentru o fotografie viitoare, ajusteaza
 * pana cand UI-ul DOM acopera exact ecranul negru din imagine.
 */
export const ECRAN_RECT = {
  top: '11.5%',
  left: '21.67%',
  width: '46.67%',
  /** border-radius eliptic: 72/560 pe orizontala, 72/1182 pe verticala. */
  raza: '12.9% / 6.1%',
  rotate: 0,
} as const
