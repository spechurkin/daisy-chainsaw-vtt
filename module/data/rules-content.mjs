const rule = (slug, sourcePage, ruName, ruDescription, enName, enDescription) => ({
  slug,
  kind: "rule",
  name: ruName,
  sourcePage,
  description: ruDescription,
  translations: {
    en: {
      name: enName,
      description: enDescription
    }
  }
});

export const RULES = [
  rule(
    "rule-playing-the-game",
    1,
    "Введение в игру",
    "Для игры нужны от трёх до семи участников, включая Мастера Происшествий, листы персонажей, поле с сеткой, письменные принадлежности и не меньше шести шестигранных костей. Игра делится на Эпизоды - отдельные встречи - и Сезоны, то есть крупные сюжетные арки. Игроки берут роли Главных Героинь, живущих обычной жизнью и превращающихся для борьбы с угрозами. Вся Команда развивается через общий Уровень.",
    "Playing the Game",
    "To play, gather three to seven people including the Disaster Master, character sheets, a few grids, writing utensils, and at least six six-sided dice. Play is divided into Episodes - individual sessions - and Seasons, or major story arcs. The players portray Main Characters who live ordinary lives and transform to face supernatural threats. The entire Team advances through a shared Power Level."
  ),
  rule(
    "rule-rolling-the-dice",
    2,
    "Броски костей",
    "Когда исход действия неочевиден, бросьте количество к6, равное Основному параметру. Каждый результат, который меньше или равен заданному порогу - обычно Вторичному параметру, - считается успехом. Шестёрка всегда является провалом. Единица всегда является успехом и взрывается: бросьте ещё одну кость. Новая единица также взрывается, и цепочка продолжается, пока не выпадет другое число. Взрывные кости не входят в исходный размер пула.",
    "Rolling the Dice",
    "When an outcome is uncertain, roll a number of d6s equal to the Primary statistic. Every result equal to or below the target - usually the Secondary statistic - counts as a hit. A 6 always misses. A 1 always hits and explodes: roll another die. Each new 1 explodes again, continuing until another result is rolled. Exploding dice do not count toward the initial pool size."
  ),
  rule(
    "rule-character-creation",
    3,
    "Создание персонажа",
    "Создание Главной Героини состоит из четырёх шагов: выберите Главное и Запасное оружие; распределите параметры; выберите постоянную Фишку Главного оружия; выберите заклинания и способности. По умолчанию Команда начинает на 1 УС.",
    "Character Creation",
    "Creating a Main Character has four steps: choose a Main and an Offhand weapon; allocate statistics; choose a permanent Quirk from the Main weapon; and choose spells and abilities. A Team begins at Power Level 1 by default."
  ),
  rule(
    "rule-choose-weapons",
    4,
    "Выбор оружия",
    "Выберите два разных оружия или одно оружие дважды. Одно становится Главным, второе - Запасным. По английскому оригиналу первый указанный параметр Главного оружия становится Основным, а альтернативный параметр Запасного оружия - Вторичным. Русское издание разрешает выбрать любой из двух параметров каждого оружия, если Основной и Вторичный различаются; этот вариант доступен в настройках мира.",
    "Choose Your Weapons",
    "Choose two different weapons, or the same weapon twice. One is Main and the other is Offhand. In the English original, the first statistic listed for the Main weapon becomes Primary and the alternate statistic of the Offhand weapon becomes Secondary. The Russian edition allows either listed statistic to be chosen as long as Primary and Secondary differ; that variant is available in the world settings."
  ),
  rule(
    "rule-allocate-statistics",
    5,
    "Распределение параметров",
    "Шарм, Фокус, Сердце и Сила начинают со значения 1. Распределите между ними ещё 6 пунктов; ни один параметр не может превышать 6. Известные заклинания равны Шарму минус 1. Скорость равна Фокусу плюс Основной и показывает число клеток по 5 футов за действие. Пул Урона равен утроенному Сердцу. Для спасброска бросьте Силу против Фокуса. Пункты Выгорания являются общим ресурсом Команды, а их безопасный предел определяется УС.",
    "Allocate Statistics",
    "Charm, Focus, Heart, and Power begin at 1. Allocate 6 additional points among them; no statistic can exceed 6. Spells Known equals Charm minus 1. Speed equals Focus plus Primary and measures the number of 5-foot increments moved with an action. The Harm Pool equals three times Heart. Saving Throws roll Power against Focus. Burnout Points are shared by the Team, and their safe cap is determined by Power Level."
  ),
  rule(
    "rule-choose-quirk",
    6,
    "Выбор Фишки",
    "Постоянная Фишка является модификацией Главного оружия. Выберите одну Фишку Главного оружия. Если оба выбранных оружия одинаковы, можно выбрать вторую постоянную Фишку. Манёвр На скорую руку временно добавляет Фишку к Главному или Запасному оружию. Постоянные Фишки можно менять при развитии.",
    "Choose a Quirk",
    "A permanent Quirk is a modification of the Main weapon. Choose one Quirk from the Main weapon. If both selected weapons are the same, choose a second permanent Quirk. The Jury-Rig maneuver temporarily adds a Quirk to either weapon. Permanent Quirks may be changed during advancement."
  ),
  rule(
    "rule-starting-spells-and-abilities",
    6,
    "Начальные заклинания и способности",
    "Героиня знает количество заклинаний, равное Шарму минус 1, и выбирает их из первого уровня. На 1 УС выберите две способности первого уровня из списков Главного и Запасного оружия. Заклинания можно менять при развитии и получать вместо новой способности. По тексту создания второй уровень открывается на 5 УС, но таблица развития выдаёт способность второго уровня уже на 4 УС; нужный вариант выбирается в настройках мира. Третий уровень открывается на 8 УС.",
    "Starting Spells and Abilities",
    "A Main Character knows a number of spells equal to Charm minus 1 and selects them from tier one. At PL 1, choose two tier-one abilities from the Main and Offhand weapon lists. Spells may be replaced during advancement and may be learned instead of a new ability. The creation text unlocks tier two at PL 5, while the advancement table grants a tier-two ability at PL 4; choose the interpretation in world settings. Tier three unlocks at PL 8."
  ),
  rule(
    "rule-advancement",
    7,
    "Развитие",
    "МП повышает общий УС Команды после значимых достижений. УС 1: две способности первого уровня и 6 дополнительных пунктов параметров. УС 2: одна способность первого уровня. УС 3: 1 пункт параметров. УС 4: одна способность первого или второго уровня. УС 5: 2 пункта параметров. УС 6: две способности первого или второго уровня в любом сочетании. УС 7: 2 пункта параметров. УС 8: одна способность любого уровня. УС 9: одна способность любого уровня. УС 10: 3 пункта параметров и одна способность любого уровня. При развитии способности можно менять на заклинания и обратно.",
    "Advancement",
    "The DM raises the Team's shared Power Level after meaningful achievements. PL 1: two tier-one abilities and 6 additional statistic points. PL 2: one tier-one ability. PL 3: 1 statistic point. PL 4: one tier-one or tier-two ability. PL 5: 2 statistic points. PL 6: two tier-one or tier-two abilities in any combination. PL 7: 2 statistic points. PL 8: one ability from any tier. PL 9: one ability from any tier. PL 10: 3 statistic points and one ability from any tier. During advancement, abilities may be exchanged for spells and vice versa."
  ),
  rule(
    "rule-team",
    57,
    "Команда",
    "Команда - группа магических Главных Героинь. Это может быть формальная команда, клуб, сестринство или просто друзья, которых свели обстоятельства. Все участники Команды считаются союзниками, несмотря на внутренние конфликты. УС и Пул Выгорания принадлежат всей Команде.",
    "The Team",
    "A Team is a group of magical Main Characters. It may be a formal team, a club, a sorority, or simply friends forced together by circumstance. All teammates count as allies despite internal conflict. Power Level and the Burnout Pool belong to the whole Team."
  ),
  rule(
    "rule-mascot",
    58,
    "Маскот",
    "Маскот может быть источником магических сил, союзником, привлечённым уже существующей силой, или причиной её появления. Маскоты не всегда говорят правду. Для создания Маскота бросьте четыре к6: отдельно определите Внешность, Характер, Происхождение и Цель по таблицам справочника.",
    "Mascot",
    "A Mascot may be the source of the Team's magic, an ally drawn to existing power, or the reason that power appeared. Mascots do not always tell the truth. To create one, roll four d6s and determine Look, Attitude, Origin, and Purpose from the Rule Browser tables."
  ),
  rule(
    "rule-combat-turns",
    59,
    "Ходы и инициатива",
    "Бой состоит из раундов, а каждый участник получает один ход и два действия за раунд. По оригиналу ГГ бросают Основной и считают успехи против наибольшей Инициативы врагов. Героиня с наибольшим числом успехов ходит первой; ничью выигрывает больший Фокус. Если ни одна ГГ не превысила наивысшую Инициативу врага, первым ходит враг по выбору МП. Закончив ход, участник выбирает следующего; после выбора союзника тот обязан выбрать врага. Последний участник выбирает первого в новом раунде. Вариант инициативы русского издания доступен в настройках мира.",
    "Turns and Initiative",
    "Combat is divided into rounds, and every combatant gets one turn with two actions each round. In the original rules, MCs roll Primary and count hits against the highest enemy Initiative. The MC with the most hits acts first; higher Focus breaks a tie. If no MC exceeds the highest enemy Initiative, an enemy chosen by the DM acts first. After acting, a combatant chooses who goes next; an ally chosen after an ally must choose an enemy. The final combatant chooses who begins the next round. The Russian-edition initiative variant is available in world settings."
  ),
  rule(
    "rule-move",
    59,
    "Движение",
    "Движение тратит одно действие. Персонаж перемещается на количество клеток по 5 футов, равное Скорости. Скорость ГГ равна Фокусу плюс Основной. Если Фокус является Основным, он прибавляется дважды. Пересечённая местность уменьшает Скорость на 2.",
    "Move",
    "Moving costs one action. A character moves a number of 5-foot increments equal to Speed. An MC's Speed equals Focus plus Primary. If Focus is Primary, add Focus twice. Rough terrain reduces Speed by 2."
  ),
  rule(
    "rule-attack",
    60,
    "Атака",
    "Обычная атака тратит одно действие. Бросьте Основной; каждый результат, не превышающий Вторичный, является успехом и наносит 1 урон. Атака считается успешной, если получен хотя бы один успех. Способности категории Урон могут включать атаку и дополнительные эффекты. Все ГГ могут атаковать смежные цели; дальность сверх этого определяется оружием.",
    "Attack",
    "A basic attack costs one action. Roll Primary; every result equal to or below Secondary is a hit and inflicts 1 Harm. An attack is successful if it scores at least one hit. Harm abilities may include an attack and additional effects. Every MC can attack adjacent targets; additional range is determined by the weapon."
  ),
  rule(
    "rule-status-effects",
    61,
    "Статусы",
    "Статус - любое продолжающееся состояние или модификатор. Чаще всего статусы появляются от манёвров и способностей. Недуги являются особенно сильными ослабляющими статусами. Длительность статусов считается раундами, а не ходами. Урон и спасброски от недугов разрешаются в начале каждого раунда до первого хода.",
    "Status Effects",
    "A status effect is any ongoing condition or modifier. Maneuvers and abilities are the most common sources. Afflictions are especially debilitating status effects. Durations are counted in rounds rather than turns. Harm and Saving Throws caused by afflictions are resolved at the beginning of each round before the first turn."
  ),
  rule(
    "rule-maneuvers",
    61,
    "Манёвры",
    "Манёвр обычно тратит одно действие, а его эффект считается статусом. Любая ГГ может использовать Помощь, Усиление, Воззвание, На скорую руку и Прикрытие. Полные эффекты каждого манёвра приведены в отдельном разделе справочника.",
    "Maneuvers",
    "A maneuver normally costs one action, and its effect counts as a status effect. Every MC may use Assist, Bolster, Invoke, Jury-Rig, and Protect. The full effect of each maneuver appears in its own Rule Browser section."
  ),
  rule(
    "rule-afflictions",
    62,
    "Недуги",
    "Урон от недугов применяется в начале раунда. ГГ и Боссы совершают спасбросок при наложении недуга и могут повторить его в начале каждого раунда отдельно для каждого недуга. Обычные враги не сопротивляются при наложении; в начале последующих раундов они бросают 1к6, и на 6 недуг заканчивается. Полные эффекты В огне, Очарования, Кровотечения, Сломан, Опутан, Отравления, Оглушения и Насмешки приведены в разделе статусов.",
    "Afflictions",
    "Harm from afflictions is applied at the beginning of the round. MCs and Bosses make a Saving Throw when an affliction is applied and may repeat it at the beginning of each round for each affliction. Ordinary enemies do not resist the initial application; at the beginning of later rounds they roll 1d6, and the affliction ends on a 6. Full rules for Aflame, Bewitch, Bleed, Crush, Entangled, Poison, Stun, and Taunt appear in the Status Effects section."
  ),
  rule(
    "rule-abilities-and-spells",
    63,
    "Способности и заклинания в бою",
    "Способность или заклинание тратит одно действие, если не указано иное или эффект не является Пассивным. Способность может включать атаку или манёвр. Бросок нужен только тогда, когда эффект совершается как атака. Дальность измеряется клетками по 5 футов. По умолчанию заклинание имеет дальность, равную удвоенному Шарму, и длится 1 ход; способность использует дальность связанного оружия. Оригинал на стр. 63 говорит о ПВ от всех способностей, а специальное правило на стр. 65 - только от способностей Урона; вариант выбирается в настройках мира.",
    "Abilities and Spells in Combat",
    "An ability or spell costs one action unless noted otherwise or labeled Passive. An ability may include an attack or maneuver. A roll is required only when the effect is made as an attack. Ranges are measured in 5-foot increments. By default, a spell has range equal to twice Charm and lasts 1 turn; an ability uses the range of its associated weapon. Page 63 says all abilities add BP, while the specific rule on page 65 limits this to Harm abilities; choose the interpretation in world settings."
  ),
  rule(
    "rule-areas-of-effect",
    63,
    "Зоны применения",
    "Зона применения затрагивает все цели внутри неё, если не сказано обратное. Аура действует во всех направлениях от исходной точки и обычно используется для постоянных или поддерживаемых эффектов. Волна мгновенно действует во всех направлениях. Линия имеет ширину 5 футов и заданную длину. Конус расширяется от исходной точки с шагом 5 футов.",
    "Areas of Effect",
    "An area of effect affects every target inside it unless stated otherwise. An Aura extends in every direction from its origin and is usually used for permanent or maintained effects. A Burst acts in every direction at once. A Line is 5 feet wide and has a specified length. A Cone expands from its origin in 5-foot increments."
  ),
  rule(
    "rule-saving-throws",
    64,
    "Спасброски",
    "Когда ГГ или Босс рискует получить недуг, бросьте количество костей, равное Силе, и считайте успехи против Фокуса. Если успехов не меньше, чем в броске, вызвавшем недуг, эффект предотвращён. Если недуг наложен без броска, число успехов должно быть не меньше УС источника.",
    "Saving Throws",
    "When an MC or Boss is at risk of an affliction, roll Power and count hits against Focus. If the number of hits equals or exceeds the hits that caused the affliction, the effect is prevented. If the affliction was applied without a roll, the number of hits must equal or exceed the source's PL."
  ),
  rule(
    "rule-harm-pool",
    64,
    "Пул Урона",
    "Пул Урона ГГ равен утроенному Сердцу. Раз за Эпизод ГГ может полностью избежать смертельного удара, получить постоянный шрам и немедленно выйти За Предел. Когда ПУ исчерпан, ГГ теряет сознание. В течение трёх ходов ей должны оказать Помощь, иначе она погибает. После Помощи героиня остаётся без сознания и восстанавливается до 1 ПУ в конце боя.",
    "Harm Pool",
    "An MC's Harm Pool equals three times Heart. Once per Episode, an MC may completely avoid a killing blow, gain a permanent scar, and immediately Push Their Limits. When HP is depleted, the MC is knocked out. They must receive Assist within three turns or die. After receiving Assist, they remain unconscious and recover to 1 HP when combat ends."
  ),
  rule(
    "rule-burnout-pool",
    65,
    "Пул Выгорания",
    "Пункты Выгорания являются общим ресурсом Команды. Заклинания и способности Урона добавляют ПВ, равные своему уровню. Безопасный предел: 10, 12, 14, 16, 18, 20, 22, 26, 30 и 34 ПВ для УС 1-10. Предел мягкий: действие всё ещё можно использовать. После добавления стоимости бросьте 1к6 и прибавьте каждую единицу превышения. При результате 6 или больше действие проваливается, а ГГ получает 1 урон.",
    "Burnout Pool",
    "Burnout Points are shared by the Team. Spells and Harm abilities add BP equal to their tier. The safe caps for PL 1-10 are 10, 12, 14, 16, 18, 20, 22, 26, 30, and 34 BP. This is a soft cap, so the action may still be attempted. After adding its cost, roll 1d6 and add every point above the cap. On a total of 6 or higher, the action fails and the MC suffers 1 Harm."
  ),
  rule(
    "rule-push-your-limits",
    66,
    "За Пределом",
    "Выход За Предел не требует действия, но совершается только в свой ход и требует минимум два условия: враги значительно превосходят Команду числом или ГГ осталась одна против Босса; у ГГ остался 1 ПУ; ПВ Команды минимум на 1 выше предела. Эффект длится 3 хода: атаки против ГГ получают -2 к Основному, её атаки получают +2 к Основному, а её способности не добавляют ПВ и не требуют проверки Выгорания. В начале хода можно отказаться от одного полезного эффекта и продлить статус на 1 ход.",
    "Push Your Limits",
    "Pushing Your Limits costs no action but may only be done during your turn and requires at least two conditions: enemies greatly outnumber the Team or the MC is the last one standing against a Boss; the MC has 1 HP; the Team is at least 1 BP above its cap. The effect lasts 3 turns: attacks against the MC suffer -2 Primary, their attacks gain +2 Primary, and their abilities add no BP and require no Burnout check. At the start of a turn, one benefit may be forfeited to extend the effect by 1 turn."
  ),
  rule(
    "rule-running-a-season",
    67,
    "Создание Сезона",
    "Эпизод - одна игровая встреча, а Сезон - серия Эпизодов, связанных общим Антагонистом. Определите Антагониста, его приспешников и злой план. Разбейте план на шаги - будущие Эпизоды. Позволяйте Антагонисту приспосабливаться к Команде и постоянно повышайте ставки. Каждый Эпизод должен давать намёки или сведения об Антагонисте и конечной цели.",
    "Running a Season",
    "An Episode is one game session, while a Season is a series of Episodes connected by a central Antagonist. Decide on the Antagonist, their minions, and an evil plan. Break that plan into steps that become Episodes. Let the Antagonist adapt to the Team and keep escalating the stakes. Every Episode should hint at or reveal information about the Antagonist and their ultimate goal."
  ),
  rule(
    "rule-running-an-episode",
    68,
    "Создание Эпизода",
    "Возьмите один шаг плана Антагониста. Начните со странного происшествия, показывающего начало действий приспешников. Дайте Команде расследовать угрозу, продолжая обычную жизнь. Свяжите повседневные обязанности ГГ с планом врага и завершите Эпизод крупным боем после превращения.",
    "Running an Episode",
    "Choose one step of the Antagonist's plan. Begin with a strange occurrence showing the henchmen at work. Let the Team investigate while continuing their ordinary lives. Entangle the MCs' mundane responsibilities with the enemy plan, and end the Episode with a major fight after the transformation."
  ),
  rule(
    "rule-episode-complications",
    69,
    "Осложнения Эпизода",
    "Главная дилемма Команды - выбор между обычной жизнью и спасением мира. Усложняйте её домашней работой, подработкой, обязанностями, питомцами и семьёй. Антагонист может брать заложников, угрожать близким и переносить бой в людные места. Готовые осложнения находятся в таблице справочника.",
    "Episode Complications",
    "The Team's hardest choice is whether to prioritize ordinary life or saving the world. Make it harder with homework, jobs, chores, pets, and family. The Antagonist may take hostages, threaten loved ones, or move a fight into a populated area. Ready-to-use complications appear in the Rule Browser table."
  ),
  rule(
    "rule-fighting-strategies",
    69,
    "Боевые стратегии",
    "Контроль поля и статусы критически важны. Вражеские кости также взрываются, поэтому бой может быть быстрым и смертельно опасным. Сочетайте обычные атаки, манёвры, недуги и пространственное преимущество; победа может быть как решительной, так и изматывающей.",
    "Fighting Strategies",
    "Crowd control and status effects are essential. Enemy dice explode too, so combat can be fast and lethal. Combine basic attacks, maneuvers, afflictions, and positional advantages; both decisive victories and draining, hard-fought victories can be satisfying."
  ),
  rule(
    "rule-enemies",
    70,
    "Противники",
    "У противника есть УС, Основной, Вторичный, Пул Урона и Инициатива. УС приблизительно показывает сложность. Атака работает как у ГГ: бросьте Основной и считайте результаты, не превышающие Вторичный. ПУ показывает, сколько урона выдерживает противник. Инициатива является статическим порогом для первого хода Команды и одновременно Скоростью противника.",
    "Enemies",
    "An enemy has Power Level, Primary, Secondary, Harm Pool, and Initiative. PL is a rough measure of difficulty. An enemy attacks like an MC: roll Primary and count results equal to or below Secondary. HP measures how much Harm the enemy can take. Initiative is the static threshold for the Team's first-turn roll and also serves as the enemy's Speed."
  ),
  rule(
    "rule-enemy-traits",
    71,
    "Черты противников",
    "Черты делают противников уникальнее и сложнее. Ориентир - одна черта на каждые два-три УС противника. Полные правила Бронированного, Большого, Уворотливого, Быстрого, Магического, Дальнобойного, Сильного и Призывателя приведены в разделе черт противников.",
    "Enemy Traits",
    "Traits make enemies more distinctive and difficult. As a rule of thumb, assign one trait for every two to three enemy PL. Full rules for Armored, Big, Elusive, Fast, Magic, Ranged, Strong, and Summoner appear in the Enemy Traits section."
  ),
  rule(
    "rule-cannon-fodder-and-witches",
    71,
    "Пушечное мясо и вражеские Ведьмы",
    "Противники УС 0 предназначены для толп и призыва; призванные существа действуют в ход призывателя. Вражескую Ведьму создайте по правилам ГГ. Обычно число Ведьм и их УС должны примерно соответствовать Команде. Ведьмы всегда считаются Боссами для спасбросков, способностей и заклинаний; при необходимости МП может разрешить им выход За Предел.",
    "Cannon Fodder and Enemy Witches",
    "PL 0 enemies are intended for swarms and summons; summoned creatures act on their summoner's turn. Build an enemy Witch using the MC rules. In general, keep the number and PL of Witches close to the Team. Witches always count as Bosses for Saving Throws, abilities, and spells; the DM may allow them to Push Their Limits when appropriate."
  ),
  rule(
    "rule-enemy-statistics",
    72,
    "Параметры противников",
    "Рекомендуемые значения по УС 0-10: Основной 1,2,2,3,3,4,4,5,5,6,6; Вторичный 2,2,3,3,4,4,5,5,6,6,5; ПУ 1,3,6,9,12,15,18,21,24,27,30; Инициатива 0,1,1,2,2,3,3,4,4,5,6. Инициатива также является Скоростью. Эти значения можно менять под роль конкретного противника.",
    "Enemy Statistics",
    "Suggested values for PL 0-10 are: Primary 1,2,2,3,3,4,4,5,5,6,6; Secondary 2,2,3,3,4,4,5,5,6,6,5; HP 1,3,6,9,12,15,18,21,24,27,30; Initiative 0,1,1,2,2,3,3,4,4,5,6. Initiative also serves as Speed. Adjust these values to fit an enemy's particular role."
  )
];
