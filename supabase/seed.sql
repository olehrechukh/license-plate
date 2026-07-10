-- App seed data: configuration, UI strings, and province reference data only.
-- Plates, comments, and votes are user-generated at runtime and are NOT seeded.
-- Run schema.sql first, then this. Re-runnable (upserts).

insert into public.app_config (id, default_lang, ranking_period) values
  (1, 'uk', '2026-07')
on conflict (id) do update set default_lang = excluded.default_lang, ranking_period = excluded.ranking_period;

insert into public.app_strings (lang, data) values
  ('uk', $strings${"site":{"name":"АвтоКарма","tagline":"Оцінюй водіїв за номерним знаком"},"nav":{"provinces":"Області","comments":"Коментарі","rankings":"Рейтинг водіїв","addComment":"Додати коментар","terms":"Правила","login":"Увійти"},"home":{"heroTitle":"Перевір водія за номерним знаком","heroSubtitle":"Читай і залишай коментарі про поведінку водіїв на дорозі. Разом робимо дороги безпечнішими.","searchLabel":"Номерний знак","searchPlaceholder":"Наприклад, BC9563H","searchButton":"Шукати","selectedCommentsTitle":"Обрані коментарі","currentRankingTitle":"Рейтинг цього місяця","viewAll":"Переглянути всі"},"provinces":{"title":"Області","intro":"Обери область, щоб переглянути коментарі про водіїв у цьому регіоні.","commentsCountLabel":"коментарів"},"comments":{"title":"Усі коментарі","sortNewest":"Найновіші","sortTopVoted":"Найпопулярніші","empty":"Коментарів поки немає.","loadMore":"Показати більше"},"rankings":{"title":"Рейтинг водіїв","subtitle":"Найгірші водії за поточний місяць за оцінками користувачів.","colRank":"Місце","colPlate":"Номер","colRegion":"Регіон","colScore":"Оцінка","colComments":"Коментарі","period":"Період"},"plateDetail":{"commentsForPlate":"Коментарі до номера","noComments":"Для цього номера ще немає коментарів.","addCommentCta":"Додати коментар про цей номер","scoreLabel":"Оцінка","reportedTimes":"Скарг: {count}"},"newComment":{"title":"Додати коментар","intro":"Опиши ситуацію на дорозі. Будь ласка, дотримуйся фактів і не використовуй образливих висловів.","fields":{"plate":{"label":"Номерний знак","placeholder":"Наприклад, BC9563H","help":"Введи номер без пробілів."},"category":{"label":"Категорія порушення","options":{"dangerous-driving":"Небезпечна їзда","illegal-parking":"Неправильне паркування","sidewalk-blocking":"Блокування тротуару","lane-misuse":"Неправильне використання смуги","aggression":"Агресія на дорозі","other":"Інше"}},"description":{"label":"Опис","placeholder":"Опиши, що сталося…","help":"Мінімум 20 символів."},"photo":{"label":"Фото або відео","help":"Необов'язково. Можна додати кадр з реєстратора."},"author":{"label":"Ім'я або нік","placeholder":"Як тебе підписати"}},"submit":"Опублікувати","submitFailed":"Не вдалося опублікувати коментар. Спробуйте ще раз.","consentText":"Публікуючи коментар, я підтверджую, що дотримуюсь правил сайту.","successMessage":"Дякуємо! Твій коментар додано."},"categories":{"dangerous-driving":"Небезпечна їзда","illegal-parking":"Неправильне паркування","sidewalk-blocking":"Блокування тротуару","lane-misuse":"Неправильне використання смуги","aggression":"Агресія на дорозі","other":"Інше"},"terms":{"title":"Правила","body":"Коментарі мають стосуватися поведінки на дорозі. Заборонено образи, персональні дані, наклеп і мову ворожнечі. Адміністрація може видаляти контент, що порушує ці правила."},"contact":{"title":"Контакти","email":"kontakt@example.com","body":"Маєш питання чи скаргу на контент? Напиши нам на електронну пошту."},"login":{"title":"Вхід","usernameLabel":"Логін","passwordLabel":"Пароль","submit":"Увійти","registerLink":"Немає акаунту? Зареєструватися"},"vote":{"label":"Оцінити коментар","up":"Підтримати","down":"Не погоджуюсь"},"footer":{"copyright":"© 2026 АвтоКарма. Усі права захищено.","contactLink":"Контакти","tagline":"Створено для безпечніших доріг."},"langSwitch":{"uk":"Українська","en":"Англійська","label":"Мова"}}$strings$::jsonb),
  ('en', $strings${"site":{"name":"AutoKarma","tagline":"Rate drivers by their license plate"},"nav":{"provinces":"Provinces","comments":"Comments","rankings":"Driver rankings","addComment":"Add comment","terms":"Terms","login":"Log in"},"home":{"heroTitle":"Check a driver by license plate","heroSubtitle":"Read and leave comments about driver behavior on the road. Together we make roads safer.","searchLabel":"License plate","searchPlaceholder":"e.g. BC9563H","searchButton":"Search","selectedCommentsTitle":"Selected comments","currentRankingTitle":"This month's ranking","viewAll":"View all"},"provinces":{"title":"Provinces","intro":"Pick a province to browse comments about drivers in that region.","commentsCountLabel":"comments"},"comments":{"title":"All comments","sortNewest":"Newest","sortTopVoted":"Top voted","empty":"No comments yet.","loadMore":"Load more"},"rankings":{"title":"Driver rankings","subtitle":"The worst drivers this month according to user ratings.","colRank":"Rank","colPlate":"Plate","colRegion":"Region","colScore":"Score","colComments":"Comments","period":"Period"},"plateDetail":{"commentsForPlate":"Comments for plate","noComments":"There are no comments for this plate yet.","addCommentCta":"Add a comment about this plate","scoreLabel":"Score","reportedTimes":"Reports: {count}"},"newComment":{"title":"Add comment","intro":"Describe the situation on the road. Please stick to the facts and avoid offensive language.","fields":{"plate":{"label":"License plate","placeholder":"e.g. BC9563H","help":"Enter the plate without spaces."},"category":{"label":"Violation category","options":{"dangerous-driving":"Dangerous driving","illegal-parking":"Illegal parking","sidewalk-blocking":"Sidewalk blocking","lane-misuse":"Lane misuse","aggression":"Road aggression","other":"Other"}},"description":{"label":"Description","placeholder":"Describe what happened…","help":"At least 20 characters."},"photo":{"label":"Photo or video","help":"Optional. You can attach a dashcam frame."},"author":{"label":"Name or nickname","placeholder":"How to sign your comment"}},"submit":"Publish","submitFailed":"We could not publish your comment. Please try again.","consentText":"By posting a comment, I confirm that I follow the site rules.","successMessage":"Thank you! Your comment has been added."},"categories":{"dangerous-driving":"Dangerous driving","illegal-parking":"Illegal parking","sidewalk-blocking":"Sidewalk blocking","lane-misuse":"Lane misuse","aggression":"Road aggression","other":"Other"},"terms":{"title":"Terms","body":"Comments must relate to road behavior. Insults, personal data, defamation, and hate speech are prohibited. Administrators may remove content that violates these rules."},"contact":{"title":"Contact","email":"kontakt@example.com","body":"Have a question or a complaint about content? Email us."},"login":{"title":"Log in","usernameLabel":"Username","passwordLabel":"Password","submit":"Log in","registerLink":"No account? Sign up"},"vote":{"label":"Rate comment","up":"Upvote","down":"Downvote"},"footer":{"copyright":"© 2026 AutoKarma. All rights reserved.","contactLink":"Contact","tagline":"Built for safer roads."},"langSwitch":{"uk":"Ukrainian","en":"English","label":"Language"}}$strings$::jsonb)
on conflict (lang) do update set data = excluded.data;

insert into public.provinces (slug, code, name_uk, name_en, sort) values
  ('crimea', 'AK', 'Автономна Республіка Крим', 'Autonomous Republic of Crimea', 0),
  ('vinnytska', 'AB', 'Вінницька', 'Vinnytsia', 1),
  ('volynska', 'AC', 'Волинська', 'Volyn', 2),
  ('dnipropetrovska', 'AE', 'Дніпропетровська', 'Dnipropetrovsk', 3),
  ('donetska', 'AH', 'Донецька', 'Donetsk', 4),
  ('zhytomyrska', 'AM', 'Житомирська', 'Zhytomyr', 5),
  ('zakarpatska', 'AO', 'Закарпатська', 'Zakarpattia', 6),
  ('zaporizka', 'AP', 'Запорізька', 'Zaporizhzhia', 7),
  ('ivano-frankivska', 'AT', 'Івано-Франківська', 'Ivano-Frankivsk', 8),
  ('kyivska', 'AI', 'Київська', 'Kyiv Oblast', 9),
  ('kirovohradska', 'BA', 'Кіровоградська', 'Kirovohrad', 10),
  ('luhanska', 'BB', 'Луганська', 'Luhansk', 11),
  ('lvivska', 'BC', 'Львівська', 'Lviv', 12),
  ('mykolaivska', 'BE', 'Миколаївська', 'Mykolaiv', 13),
  ('odeska', 'BH', 'Одеська', 'Odesa', 14),
  ('poltavska', 'BI', 'Полтавська', 'Poltava', 15),
  ('rivnenska', 'BK', 'Рівненська', 'Rivne', 16),
  ('sumska', 'BM', 'Сумська', 'Sumy', 17),
  ('ternopilska', 'BO', 'Тернопільська', 'Ternopil', 18),
  ('kharkivska', 'AX', 'Харківська', 'Kharkiv', 19),
  ('khersonska', 'BT', 'Херсонська', 'Kherson', 20),
  ('khmelnytska', 'BX', 'Хмельницька', 'Khmelnytskyi', 21),
  ('cherkaska', 'CA', 'Черкаська', 'Cherkasy', 22),
  ('chernivetska', 'CE', 'Чернівецька', 'Chernivtsi', 23),
  ('chernihivska', 'CB', 'Чернігівська', 'Chernihiv', 24),
  ('kyiv-city', 'AA', 'м. Київ', 'Kyiv (city)', 25),
  ('sevastopol-city', 'CH', 'м. Севастополь', 'Sevastopol (city)', 26)
on conflict (slug) do update set code = excluded.code, name_uk = excluded.name_uk, name_en = excluded.name_en, sort = excluded.sort;


insert into public.app_strings (lang, data) values
  ('uk', '{"auth":{"googleSignIn":"Увійти через Google","signOut":"Вийти","signingIn":"Переадресація…","signInFailed":"Не вдалося увійти через Google. Спробуйте ще раз."}}'::jsonb),
  ('en', '{"auth":{"googleSignIn":"Sign in with Google","signOut":"Sign out","signingIn":"Redirecting…","signInFailed":"Could not sign in with Google. Please try again."}}'::jsonb)
on conflict (lang) do update set data = jsonb_set(coalesce(public.app_strings.data, '{}'::jsonb), '{auth}', excluded.data -> 'auth', true);
