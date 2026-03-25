import type { Tense, Person } from './verbs'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Conjugation Templates
// ─────────────────────────────────────────────────────────────────────────────

export interface ConjugationTemplate {
  person: Person
  tense: Tense
  template: string                     // "Eu ___ ({verb}) todos os dias."
  translation: Record<string, string>  // { ru: "Я ___ ({verb}) каждый день.", en: "I ___ ({verb}) every day." }
}

export const CONJUGATION_TEMPLATES: ConjugationTemplate[] = [
  // ──────────────────────────────────────────────
  // Presente — eu
  // ──────────────────────────────────────────────
  {
    person: 'eu',
    tense: 'presente',
    template: 'Eu ___ ({verb}) todos os dias.',
    translation: { ru: 'Я ___ ({verb}) каждый день.', en: 'I ___ ({verb}) every day.' },
  },
  {
    person: 'eu',
    tense: 'presente',
    template: 'Eu sempre ___ ({verb}) de manhã.',
    translation: { ru: 'Я всегда ___ ({verb}) утром.', en: 'I always ___ ({verb}) in the morning.' },
  },
  {
    person: 'eu',
    tense: 'presente',
    template: 'Eu ___ ({verb}) muito bem.',
    translation: { ru: 'Я ___ ({verb}) очень хорошо.', en: 'I ___ ({verb}) very well.' },
  },

  // ──────────────────────────────────────────────
  // Presente — tu
  // ──────────────────────────────────────────────
  {
    person: 'tu',
    tense: 'presente',
    template: 'Tu ___ ({verb}) todos os dias?',
    translation: { ru: 'Ты ___ ({verb}) каждый день?', en: 'Do you ___ ({verb}) every day?' },
  },
  {
    person: 'tu',
    tense: 'presente',
    template: 'Tu ___ ({verb}) bem.',
    translation: { ru: 'Ты ___ ({verb}) хорошо.', en: 'You ___ ({verb}) well.' },
  },
  {
    person: 'tu',
    tense: 'presente',
    template: 'Tu ___ ({verb}) à noite?',
    translation: { ru: 'Ты ___ ({verb}) вечером?', en: 'Do you ___ ({verb}) at night?' },
  },

  // ──────────────────────────────────────────────
  // Presente — ele/ela
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'Ele ___ ({verb}) muito.',
    translation: { ru: 'Он ___ ({verb}) много.', en: 'He ___ ({verb}) a lot.' },
  },
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'Ela ___ ({verb}) bem.',
    translation: { ru: 'Она ___ ({verb}) хорошо.', en: 'She ___ ({verb}) well.' },
  },
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'O Pedro ___ ({verb}) todos os dias.',
    translation: { ru: 'Педру ___ ({verb}) каждый день.', en: 'Pedro ___ ({verb}) every day.' },
  },

  // ──────────────────────────────────────────────
  // Presente — você (= ele/ela)
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'Você ___ ({verb}) todos os dias?',
    translation: { ru: 'Вы ___ ({verb}) каждый день?', en: 'Do you ___ ({verb}) every day?' },
  },
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'Você ___ ({verb}) bem.',
    translation: { ru: 'Вы ___ ({verb}) хорошо.', en: 'You ___ ({verb}) well.' },
  },
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'Você ___ ({verb}) muito?',
    translation: { ru: 'Вы ___ ({verb}) много?', en: 'Do you ___ ({verb}) a lot?' },
  },

  // ──────────────────────────────────────────────
  // Presente — o senhor / a senhora (= ele/ela)
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'O senhor ___ ({verb}) aqui?',
    translation: { ru: 'Вы ___ ({verb}) здесь?', en: 'Do you ___ ({verb}) here, sir?' },
  },
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'A senhora ___ ({verb}) todos os dias?',
    translation: { ru: 'Вы ___ ({verb}) каждый день?', en: 'Do you ___ ({verb}) every day, ma\'am?' },
  },
  {
    person: 'ele_ela',
    tense: 'presente',
    template: 'O senhor ___ ({verb}) bem.',
    translation: { ru: 'Вы ___ ({verb}) хорошо.', en: 'You ___ ({verb}) well, sir.' },
  },

  // ──────────────────────────────────────────────
  // Presente — nós
  // ──────────────────────────────────────────────
  {
    person: 'nos',
    tense: 'presente',
    template: 'Nós ___ ({verb}) juntos.',
    translation: { ru: 'Мы ___ ({verb}) вместе.', en: 'We ___ ({verb}) together.' },
  },
  {
    person: 'nos',
    tense: 'presente',
    template: 'Nós ___ ({verb}) em casa.',
    translation: { ru: 'Мы ___ ({verb}) дома.', en: 'We ___ ({verb}) at home.' },
  },
  {
    person: 'nos',
    tense: 'presente',
    template: 'Nós ___ ({verb}) muito bem.',
    translation: { ru: 'Мы ___ ({verb}) очень хорошо.', en: 'We ___ ({verb}) very well.' },
  },

  // ──────────────────────────────────────────────
  // Presente — eles/elas
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Eles ___ ({verb}) todos os dias.',
    translation: { ru: 'Они ___ ({verb}) каждый день.', en: 'They ___ ({verb}) every day.' },
  },
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Os alunos ___ ({verb}) na escola.',
    translation: { ru: 'Ученики ___ ({verb}) в школе.', en: 'The students ___ ({verb}) at school.' },
  },
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Elas ___ ({verb}) muito.',
    translation: { ru: 'Они ___ ({verb}) много.', en: 'They ___ ({verb}) a lot.' },
  },

  // ──────────────────────────────────────────────
  // Presente — vocês (= eles/elas)
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Vocês ___ ({verb}) juntos?',
    translation: { ru: 'Вы ___ ({verb}) вместе?', en: 'Do you ___ ({verb}) together?' },
  },
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Vocês ___ ({verb}) todos os dias?',
    translation: { ru: 'Вы ___ ({verb}) каждый день?', en: 'Do you all ___ ({verb}) every day?' },
  },
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Vocês ___ ({verb}) muito?',
    translation: { ru: 'Вы ___ ({verb}) много?', en: 'Do you all ___ ({verb}) a lot?' },
  },

  // ──────────────────────────────────────────────
  // Presente — os senhores / as senhoras (= eles/elas)
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Os senhores ___ ({verb}) aqui?',
    translation: { ru: 'Вы ___ ({verb}) здесь?', en: 'Do you ___ ({verb}) here, sirs?' },
  },
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'As senhoras ___ ({verb}) todos os dias?',
    translation: { ru: 'Вы ___ ({verb}) каждый день?', en: 'Do you ___ ({verb}) every day, ladies?' },
  },
  {
    person: 'eles_elas',
    tense: 'presente',
    template: 'Os senhores ___ ({verb}) bem.',
    translation: { ru: 'Вы ___ ({verb}) хорошо.', en: 'You ___ ({verb}) well, sirs.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — eu
  // ──────────────────────────────────────────────
  {
    person: 'eu',
    tense: 'preterito_perfeito',
    template: 'Ontem eu ___ ({verb}) muito.',
    translation: { ru: 'Вчера я ___ ({verb}) много.', en: 'Yesterday I ___ ({verb}) a lot.' },
  },
  {
    person: 'eu',
    tense: 'preterito_perfeito',
    template: 'Eu ___ ({verb}) na semana passada.',
    translation: { ru: 'Я ___ ({verb}) на прошлой неделе.', en: 'I ___ ({verb}) last week.' },
  },
  {
    person: 'eu',
    tense: 'preterito_perfeito',
    template: 'Eu ___ ({verb}) ontem à noite.',
    translation: { ru: 'Я ___ ({verb}) вчера вечером.', en: 'I ___ ({verb}) last night.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — tu
  // ──────────────────────────────────────────────
  {
    person: 'tu',
    tense: 'preterito_perfeito',
    template: 'Tu ___ ({verb}) ontem?',
    translation: { ru: 'Ты ___ ({verb}) вчера?', en: 'Did you ___ ({verb}) yesterday?' },
  },
  {
    person: 'tu',
    tense: 'preterito_perfeito',
    template: 'Tu ___ ({verb}) no fim de semana.',
    translation: { ru: 'Ты ___ ({verb}) в выходные.', en: 'You ___ ({verb}) on the weekend.' },
  },
  {
    person: 'tu',
    tense: 'preterito_perfeito',
    template: 'Tu ___ ({verb}) bem ontem.',
    translation: { ru: 'Ты ___ ({verb}) хорошо вчера.', en: 'You ___ ({verb}) well yesterday.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — ele/ela
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'Ele ___ ({verb}) ontem.',
    translation: { ru: 'Он ___ ({verb}) вчера.', en: 'He ___ ({verb}) yesterday.' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'A Maria ___ ({verb}) na semana passada.',
    translation: { ru: 'Мария ___ ({verb}) на прошлой неделе.', en: 'Maria ___ ({verb}) last week.' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'Ela ___ ({verb}) muito ontem.',
    translation: { ru: 'Она ___ ({verb}) много вчера.', en: 'She ___ ({verb}) a lot yesterday.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — você (= ele/ela)
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'Você ___ ({verb}) ontem?',
    translation: { ru: 'Вы ___ ({verb}) вчера?', en: 'Did you ___ ({verb}) yesterday?' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'Você ___ ({verb}) no fim de semana?',
    translation: { ru: 'Вы ___ ({verb}) в выходные?', en: 'Did you ___ ({verb}) on the weekend?' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'Você ___ ({verb}) bem ontem.',
    translation: { ru: 'Вы ___ ({verb}) хорошо вчера.', en: 'You ___ ({verb}) well yesterday.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — o senhor / a senhora (= ele/ela)
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'A senhora ___ ({verb}) ontem?',
    translation: { ru: 'Вы ___ ({verb}) вчера?', en: 'Did you ___ ({verb}) yesterday, ma\'am?' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'O senhor ___ ({verb}) na semana passada?',
    translation: { ru: 'Вы ___ ({verb}) на прошлой неделе?', en: 'Did you ___ ({verb}) last week, sir?' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_perfeito',
    template: 'A senhora ___ ({verb}) muito ontem.',
    translation: { ru: 'Вы ___ ({verb}) много вчера.', en: 'You ___ ({verb}) a lot yesterday, ma\'am.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — nós
  // ──────────────────────────────────────────────
  {
    person: 'nos',
    tense: 'preterito_perfeito',
    template: 'Nós ___ ({verb}) juntos ontem.',
    translation: { ru: 'Мы ___ ({verb}) вместе вчера.', en: 'We ___ ({verb}) together yesterday.' },
  },
  {
    person: 'nos',
    tense: 'preterito_perfeito',
    template: 'Nós ___ ({verb}) no mês passado.',
    translation: { ru: 'Мы ___ ({verb}) в прошлом месяце.', en: 'We ___ ({verb}) last month.' },
  },
  {
    person: 'nos',
    tense: 'preterito_perfeito',
    template: 'Nós ___ ({verb}) muito bem ontem.',
    translation: { ru: 'Мы ___ ({verb}) очень хорошо вчера.', en: 'We ___ ({verb}) very well yesterday.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — eles/elas
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'Eles ___ ({verb}) ontem à tarde.',
    translation: { ru: 'Они ___ ({verb}) вчера днём.', en: 'They ___ ({verb}) yesterday afternoon.' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'Os amigos ___ ({verb}) no sábado.',
    translation: { ru: 'Друзья ___ ({verb}) в субботу.', en: 'The friends ___ ({verb}) on Saturday.' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'Elas ___ ({verb}) na semana passada.',
    translation: { ru: 'Они ___ ({verb}) на прошлой неделе.', en: 'They ___ ({verb}) last week.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — vocês (= eles/elas)
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'Vocês ___ ({verb}) ontem?',
    translation: { ru: 'Вы ___ ({verb}) вчера?', en: 'Did you all ___ ({verb}) yesterday?' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'Vocês ___ ({verb}) no sábado?',
    translation: { ru: 'Вы ___ ({verb}) в субботу?', en: 'Did you all ___ ({verb}) on Saturday?' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'Vocês ___ ({verb}) juntos ontem?',
    translation: { ru: 'Вы ___ ({verb}) вместе вчера?', en: 'Did you all ___ ({verb}) together yesterday?' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Perfeito — os senhores / as senhoras (= eles/elas)
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'As senhoras ___ ({verb}) ontem?',
    translation: { ru: 'Вы ___ ({verb}) вчера?', en: 'Did you ___ ({verb}) yesterday, ladies?' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'Os senhores ___ ({verb}) na semana passada?',
    translation: { ru: 'Вы ___ ({verb}) на прошлой неделе?', en: 'Did you ___ ({verb}) last week, sirs?' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_perfeito',
    template: 'As senhoras ___ ({verb}) muito ontem.',
    translation: { ru: 'Вы ___ ({verb}) много вчера.', en: 'You ___ ({verb}) a lot yesterday, ladies.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — eu
  // ──────────────────────────────────────────────
  {
    person: 'eu',
    tense: 'preterito_imperfeito',
    template: 'Quando era criança, eu ___ ({verb}) muito.',
    translation: { ru: 'Когда я был ребёнком, я ___ ({verb}) много.', en: 'When I was a child, I used to ___ ({verb}) a lot.' },
  },
  {
    person: 'eu',
    tense: 'preterito_imperfeito',
    template: 'Antes, eu ___ ({verb}) todos os dias.',
    translation: { ru: 'Раньше я ___ ({verb}) каждый день.', en: 'Before, I used to ___ ({verb}) every day.' },
  },
  {
    person: 'eu',
    tense: 'preterito_imperfeito',
    template: 'No ano passado, eu ___ ({verb}) muito.',
    translation: { ru: 'В прошлом году я ___ ({verb}) много.', en: 'Last year, I used to ___ ({verb}) a lot.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — tu
  // ──────────────────────────────────────────────
  {
    person: 'tu',
    tense: 'preterito_imperfeito',
    template: 'Quando eras jovem, tu ___ ({verb}) muito.',
    translation: { ru: 'Когда ты был молодым, ты ___ ({verb}) много.', en: 'When you were young, you used to ___ ({verb}) a lot.' },
  },
  {
    person: 'tu',
    tense: 'preterito_imperfeito',
    template: 'Antes, tu ___ ({verb}) bem.',
    translation: { ru: 'Раньше ты ___ ({verb}) хорошо.', en: 'Before, you used to ___ ({verb}) well.' },
  },
  {
    person: 'tu',
    tense: 'preterito_imperfeito',
    template: 'Tu ___ ({verb}) todos os dias quando eras pequeno.',
    translation: { ru: 'Ты ___ ({verb}) каждый день, когда был маленьким.', en: 'You used to ___ ({verb}) every day when you were little.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — ele/ela
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'Ele ___ ({verb}) muito quando era jovem.',
    translation: { ru: 'Он ___ ({verb}) много, когда был молодым.', en: 'He used to ___ ({verb}) a lot when he was young.' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'A Ana ___ ({verb}) todos os dias.',
    translation: { ru: 'Ана ___ ({verb}) каждый день.', en: 'Ana used to ___ ({verb}) every day.' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'Ela ___ ({verb}) em casa antes.',
    translation: { ru: 'Она ___ ({verb}) дома раньше.', en: 'She used to ___ ({verb}) at home before.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — você (= ele/ela)
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'Você ___ ({verb}) muito antes?',
    translation: { ru: 'Вы ___ ({verb}) много раньше?', en: 'Did you used to ___ ({verb}) a lot before?' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'Quando era jovem, você ___ ({verb}) muito.',
    translation: { ru: 'Когда вы были молодым, вы ___ ({verb}) много.', en: 'When you were young, you used to ___ ({verb}) a lot.' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'Antes, você ___ ({verb}) todos os dias.',
    translation: { ru: 'Раньше вы ___ ({verb}) каждый день.', en: 'Before, you used to ___ ({verb}) every day.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — o senhor / a senhora (= ele/ela)
  // ──────────────────────────────────────────────
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'O senhor ___ ({verb}) muito antes?',
    translation: { ru: 'Вы ___ ({verb}) много раньше?', en: 'Did you used to ___ ({verb}) a lot before, sir?' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'A senhora ___ ({verb}) todos os dias antes.',
    translation: { ru: 'Вы ___ ({verb}) каждый день раньше.', en: 'You used to ___ ({verb}) every day before, ma\'am.' },
  },
  {
    person: 'ele_ela',
    tense: 'preterito_imperfeito',
    template: 'Antes, o senhor ___ ({verb}) aqui.',
    translation: { ru: 'Раньше вы ___ ({verb}) здесь.', en: 'Before, you used to ___ ({verb}) here, sir.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — nós
  // ──────────────────────────────────────────────
  {
    person: 'nos',
    tense: 'preterito_imperfeito',
    template: 'Antes, nós ___ ({verb}) juntos.',
    translation: { ru: 'Раньше мы ___ ({verb}) вместе.', en: 'Before, we used to ___ ({verb}) together.' },
  },
  {
    person: 'nos',
    tense: 'preterito_imperfeito',
    template: 'Nós ___ ({verb}) muito quando éramos jovens.',
    translation: { ru: 'Мы ___ ({verb}) много, когда были молодыми.', en: 'We used to ___ ({verb}) a lot when we were young.' },
  },
  {
    person: 'nos',
    tense: 'preterito_imperfeito',
    template: 'Nós ___ ({verb}) todos os fins de semana.',
    translation: { ru: 'Мы ___ ({verb}) каждые выходные.', en: 'We used to ___ ({verb}) every weekend.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — eles/elas
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'Eles ___ ({verb}) muito antes.',
    translation: { ru: 'Они ___ ({verb}) много раньше.', en: 'They used to ___ ({verb}) a lot before.' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'As crianças ___ ({verb}) todos os dias.',
    translation: { ru: 'Дети ___ ({verb}) каждый день.', en: 'The children used to ___ ({verb}) every day.' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'Elas ___ ({verb}) quando eram pequenas.',
    translation: { ru: 'Они ___ ({verb}), когда были маленькими.', en: 'They used to ___ ({verb}) when they were little.' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — vocês (= eles/elas)
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'Vocês ___ ({verb}) muito antes?',
    translation: { ru: 'Вы ___ ({verb}) много раньше?', en: 'Did you all used to ___ ({verb}) a lot before?' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'Antes, vocês ___ ({verb}) juntos.',
    translation: { ru: 'Раньше вы ___ ({verb}) вместе.', en: 'Before, you all used to ___ ({verb}) together.' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'Vocês ___ ({verb}) todos os fins de semana?',
    translation: { ru: 'Вы ___ ({verb}) каждые выходные?', en: 'Did you all used to ___ ({verb}) every weekend?' },
  },

  // ──────────────────────────────────────────────
  // Pretérito Imperfeito — os senhores / as senhoras (= eles/elas)
  // ──────────────────────────────────────────────
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'Os senhores ___ ({verb}) muito antes?',
    translation: { ru: 'Вы ___ ({verb}) много раньше?', en: 'Did you used to ___ ({verb}) a lot before, sirs?' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'As senhoras ___ ({verb}) todos os dias antes.',
    translation: { ru: 'Вы ___ ({verb}) каждый день раньше.', en: 'You used to ___ ({verb}) every day before, ladies.' },
  },
  {
    person: 'eles_elas',
    tense: 'preterito_imperfeito',
    template: 'Antes, os senhores ___ ({verb}) aqui.',
    translation: { ru: 'Раньше вы ___ ({verb}) здесь.', en: 'Before, you used to ___ ({verb}) here, sirs.' },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. Article Templates
// ─────────────────────────────────────────────────────────────────────────────

export type ArticleType = 'def' | 'indef' | 'defPl' | 'indefPl'

export interface ArticleTemplate {
  articleType: ArticleType
  template: string                     // "___ {noun} está na mesa."
  translation: Record<string, string>  // { ru: "___ {noun} на столе.", en: "The {noun} is on the table." }
}

export const ARTICLE_TEMPLATES: ArticleTemplate[] = [
  // ── Definite singular (o / a) ────────────────────────────────────────
  {
    articleType: 'def',
    template: '___ {noun} está na mesa.',
    translation: { ru: '___ {noun} на столе.', en: 'The {noun} is on the table.' },
  },
  {
    articleType: 'def',
    template: '___ {noun} é bonito.',
    translation: { ru: '___ {noun} красивый.', en: 'The {noun} is beautiful.' },
  },
  {
    articleType: 'def',
    template: '___ {noun} é grande.',
    translation: { ru: '___ {noun} большой.', en: 'The {noun} is big.' },
  },
  {
    articleType: 'def',
    template: 'Onde está ___ {noun}?',
    translation: { ru: 'Где ___ {noun}?', en: 'Where is the {noun}?' },
  },

  // ── Indefinite singular (um / uma) ──────────────────────────────────
  {
    articleType: 'indef',
    template: 'Eu quero ___ {noun}.',
    translation: { ru: 'Я хочу ___ {noun}.', en: 'I want a {noun}.' },
  },
  {
    articleType: 'indef',
    template: 'Há ___ {noun} ali.',
    translation: { ru: 'Там есть ___ {noun}.', en: 'There is a {noun} over there.' },
  },
  {
    articleType: 'indef',
    template: 'Eu vi ___ {noun} na rua.',
    translation: { ru: 'Я увидел(а) ___ {noun} на улице.', en: 'I saw a {noun} on the street.' },
  },
  {
    articleType: 'indef',
    template: 'Preciso ___ {noun}.',
    translation: { ru: 'Мне нужен/нужна ___ {noun}.', en: 'I need a {noun}.' },
  },

  // ── Definite plural (os / as) ───────────────────────────────────────
  {
    articleType: 'defPl',
    template: '___ {noun} são novos.',
    translation: { ru: '___ {noun} новые.', en: 'The {noun} are new.' },
  },
  {
    articleType: 'defPl',
    template: '___ {noun} estão aqui.',
    translation: { ru: '___ {noun} здесь.', en: 'The {noun} are here.' },
  },
  {
    articleType: 'defPl',
    template: 'Onde estão ___ {noun}?',
    translation: { ru: 'Где ___ {noun}?', en: 'Where are the {noun}?' },
  },
  {
    articleType: 'defPl',
    template: '___ {noun} são muito bons.',
    translation: { ru: '___ {noun} очень хорошие.', en: 'The {noun} are very good.' },
  },

  // ── Indefinite plural (uns / umas) ──────────────────────────────────
  {
    articleType: 'indefPl',
    template: 'Eu comprei ___ {noun}.',
    translation: { ru: 'Я купил(а) ___ {noun}.', en: 'I bought some {noun}.' },
  },
  {
    articleType: 'indefPl',
    template: 'Há ___ {noun} na sala.',
    translation: { ru: 'В комнате есть ___ {noun}.', en: 'There are some {noun} in the room.' },
  },
  {
    articleType: 'indefPl',
    template: 'Eu vi ___ {noun} na loja.',
    translation: { ru: 'Я увидел(а) ___ {noun} в магазине.', en: 'I saw some {noun} at the shop.' },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 3. Plural Templates
// ─────────────────────────────────────────────────────────────────────────────

export interface PluralTemplate {
  template: string                     // "Há muitos ___ ({noun}) na escola."
  translation: Record<string, string>  // { ru: "В школе много ___ ({noun}).", en: "There are many ___ ({noun}) at school." }
}

export const PLURAL_TEMPLATES: PluralTemplate[] = [
  {
    template: 'Há muitos ___ ({noun}) aqui.',
    translation: { ru: 'Здесь много ___ ({noun}).', en: 'There are many ___ ({noun}) here.' },
  },
  {
    template: 'Os ___ ({noun}) são bonitos.',
    translation: { ru: '___ ({noun}) красивые.', en: 'The ___ ({noun}) are beautiful.' },
  },
  {
    template: 'Eu comprei dois ___ ({noun}).',
    translation: { ru: 'Я купил(а) два ___ ({noun}).', en: 'I bought two ___ ({noun}).' },
  },
  {
    template: 'Há três ___ ({noun}) na mesa.',
    translation: { ru: 'На столе три ___ ({noun}).', en: 'There are three ___ ({noun}) on the table.' },
  },
  {
    template: 'Tenho muitos ___ ({noun}) em casa.',
    translation: { ru: 'У меня дома много ___ ({noun}).', en: 'I have many ___ ({noun}) at home.' },
  },
  {
    template: 'Os ___ ({noun}) estão na sala.',
    translation: { ru: '___ ({noun}) в комнате.', en: 'The ___ ({noun}) are in the room.' },
  },
  {
    template: 'Preciso de mais ___ ({noun}).',
    translation: { ru: 'Мне нужно больше ___ ({noun}).', en: 'I need more ___ ({noun}).' },
  },
  {
    template: 'Há ___ ({noun}) na escola.',
    translation: { ru: 'В школе есть ___ ({noun}).', en: 'There are ___ ({noun}) at school.' },
  },
  {
    template: 'Eu vi muitos ___ ({noun}) na cidade.',
    translation: { ru: 'Я видел(а) много ___ ({noun}) в городе.', en: 'I saw many ___ ({noun}) in the city.' },
  },
  {
    template: 'Os ___ ({noun}) são grandes.',
    translation: { ru: '___ ({noun}) большие.', en: 'The ___ ({noun}) are big.' },
  },
]
