-- AUTO-GENERATED from site-feed.json by supabase/generate-seed.mjs — do not edit by hand.
-- Run schema.sql first, then this. Re-runnable (upserts).

insert into public.app_config (id, default_lang, ranking_period) values
  (1, 'uk', '2026-07')
on conflict (id) do update set default_lang = excluded.default_lang, ranking_period = excluded.ranking_period;

insert into public.app_strings (lang, data) values
  ('uk', $strings${"site":{"name":"Номерний знак","tagline":"Оцінюй водіїв за номерним знаком"},"nav":{"provinces":"Області","comments":"Коментарі","rankings":"Рейтинг водіїв","addComment":"Додати коментар","terms":"Правила","login":"Увійти"},"home":{"heroTitle":"Перевір водія за номерним знаком","heroSubtitle":"Читай і залишай коментарі про поведінку водіїв на дорозі. Разом робимо дороги безпечнішими.","searchLabel":"Номерний знак","searchPlaceholder":"Наприклад, KK9563H","searchButton":"Шукати","selectedCommentsTitle":"Обрані коментарі","currentRankingTitle":"Рейтинг цього місяця","viewAll":"Переглянути всі"},"provinces":{"title":"Області","intro":"Обери область, щоб переглянути коментарі про водіїв у цьому регіоні.","commentsCountLabel":"коментарів"},"comments":{"title":"Усі коментарі","sortNewest":"Найновіші","sortTopVoted":"Найпопулярніші","empty":"Коментарів поки немає.","loadMore":"Показати більше"},"rankings":{"title":"Рейтинг водіїв","subtitle":"Найгірші водії за поточний місяць за оцінками користувачів.","colRank":"Місце","colPlate":"Номер","colRegion":"Регіон","colScore":"Оцінка","colComments":"Коментарі","period":"Період"},"plateDetail":{"commentsForPlate":"Коментарі до номера","noComments":"Для цього номера ще немає коментарів.","addCommentCta":"Додати коментар про цей номер","scoreLabel":"Оцінка","reportedTimes":"Скарг: {count}"},"newComment":{"title":"Додати коментар","intro":"Опиши ситуацію на дорозі. Будь ласка, дотримуйся фактів і не використовуй образливих висловів.","fields":{"plate":{"label":"Номерний знак","placeholder":"Наприклад, KK9563H","help":"Введи номер без пробілів."},"category":{"label":"Категорія порушення","options":{"dangerous-driving":"Небезпечна їзда","illegal-parking":"Неправильне паркування","sidewalk-blocking":"Блокування тротуару","lane-misuse":"Неправильне використання смуги","aggression":"Агресія на дорозі","other":"Інше"}},"description":{"label":"Опис","placeholder":"Опиши, що сталося…","help":"Мінімум 20 символів."},"photo":{"label":"Фото або відео","help":"Необов'язково. Можна додати кадр з реєстратора."},"author":{"label":"Ім'я або нік","placeholder":"Як тебе підписати"}},"submit":"Опублікувати","consentText":"Публікуючи коментар, я підтверджую, що дотримуюсь правил сайту.","successMessage":"Дякуємо! Твій коментар додано."},"categories":{"dangerous-driving":"Небезпечна їзда","illegal-parking":"Неправильне паркування","sidewalk-blocking":"Блокування тротуару","lane-misuse":"Неправильне використання смуги","aggression":"Агресія на дорозі","other":"Інше"},"terms":{"title":"Правила","body":"Коментарі мають стосуватися поведінки на дорозі. Заборонено образи, персональні дані, наклеп і мову ворожнечі. Адміністрація може видаляти контент, що порушує ці правила."},"contact":{"title":"Контакти","email":"kontakt@example.com","body":"Маєш питання чи скаргу на контент? Напиши нам на електронну пошту."},"login":{"title":"Вхід","usernameLabel":"Логін","passwordLabel":"Пароль","submit":"Увійти","registerLink":"Немає акаунту? Зареєструватися"},"vote":{"label":"Оцінити коментар","up":"Підтримати","down":"Не погоджуюсь"},"footer":{"copyright":"© 2026 Номерний знак. Усі права захищено.","contactLink":"Контакти","tagline":"Створено для безпечніших доріг."},"langSwitch":{"uk":"Українська","en":"Англійська","label":"Мова"}}$strings$::jsonb),
  ('en', $strings${"site":{"name":"License Plate","tagline":"Rate drivers by their license plate"},"nav":{"provinces":"Provinces","comments":"Comments","rankings":"Driver rankings","addComment":"Add comment","terms":"Terms","login":"Log in"},"home":{"heroTitle":"Check a driver by license plate","heroSubtitle":"Read and leave comments about driver behavior on the road. Together we make roads safer.","searchLabel":"License plate","searchPlaceholder":"e.g. KK9563H","searchButton":"Search","selectedCommentsTitle":"Selected comments","currentRankingTitle":"This month's ranking","viewAll":"View all"},"provinces":{"title":"Provinces","intro":"Pick a province to browse comments about drivers in that region.","commentsCountLabel":"comments"},"comments":{"title":"All comments","sortNewest":"Newest","sortTopVoted":"Top voted","empty":"No comments yet.","loadMore":"Load more"},"rankings":{"title":"Driver rankings","subtitle":"The worst drivers this month according to user ratings.","colRank":"Rank","colPlate":"Plate","colRegion":"Region","colScore":"Score","colComments":"Comments","period":"Period"},"plateDetail":{"commentsForPlate":"Comments for plate","noComments":"There are no comments for this plate yet.","addCommentCta":"Add a comment about this plate","scoreLabel":"Score","reportedTimes":"Reports: {count}"},"newComment":{"title":"Add comment","intro":"Describe the situation on the road. Please stick to the facts and avoid offensive language.","fields":{"plate":{"label":"License plate","placeholder":"e.g. KK9563H","help":"Enter the plate without spaces."},"category":{"label":"Violation category","options":{"dangerous-driving":"Dangerous driving","illegal-parking":"Illegal parking","sidewalk-blocking":"Sidewalk blocking","lane-misuse":"Lane misuse","aggression":"Road aggression","other":"Other"}},"description":{"label":"Description","placeholder":"Describe what happened…","help":"At least 20 characters."},"photo":{"label":"Photo or video","help":"Optional. You can attach a dashcam frame."},"author":{"label":"Name or nickname","placeholder":"How to sign your comment"}},"submit":"Publish","consentText":"By posting a comment, I confirm that I follow the site rules.","successMessage":"Thank you! Your comment has been added."},"categories":{"dangerous-driving":"Dangerous driving","illegal-parking":"Illegal parking","sidewalk-blocking":"Sidewalk blocking","lane-misuse":"Lane misuse","aggression":"Road aggression","other":"Other"},"terms":{"title":"Terms","body":"Comments must relate to road behavior. Insults, personal data, defamation, and hate speech are prohibited. Administrators may remove content that violates these rules."},"contact":{"title":"Contact","email":"kontakt@example.com","body":"Have a question or a complaint about content? Email us."},"login":{"title":"Log in","usernameLabel":"Username","passwordLabel":"Password","submit":"Log in","registerLink":"No account? Sign up"},"vote":{"label":"Rate comment","up":"Upvote","down":"Downvote"},"footer":{"copyright":"© 2026 License Plate. All rights reserved.","contactLink":"Contact","tagline":"Built for safer roads."},"langSwitch":{"uk":"Ukrainian","en":"English","label":"Language"}}$strings$::jsonb)
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

insert into public.plates (plate, province, score) values
  ('KK9563H', 'lvivska', -42),
  ('WI772MC', 'kyivska', -27),
  ('GD1450A', 'odeska', -15),
  ('PO88231', 'kharkivska', -33),
  ('DW5T900', 'dnipropetrovska', -8),
  ('SK4021L', 'donetska', -19),
  ('LU3120K', 'poltavska', -7),
  ('RZ7788B', 'zakarpatska', -6),
  ('EL9004C', 'zhytomyrska', -5),
  ('ZS2210D', 'khersonska', -3)
on conflict (plate) do update set province = excluded.province, score = excluded.score;

insert into public.comments (id, plate, author, category, text_uk, text_en, photo, upvotes, downvotes, created_at) values
  ('c-1001', 'KK9563H', 'driver_krk', 'lane-misuse', 'Їхав лівою смугою автомагістралі 10 км, блокуючи рух, попри вільну праву смугу.', 'Drove in the left motorway lane for 10 km blocking traffic despite the right lane being clear.', 'https://placehold.co/640x360?text=dashcam', 31, 4, '2026-07-02T08:14:00Z'),
  ('c-1002', 'KK9563H', 'anna_p', 'aggression', 'Сигналив і показував непристойні жести на світлофорі без жодної причини.', 'Honked and made rude gestures at the traffic light for no reason at all.', null, 11, 2, '2026-06-28T17:40:00Z'),
  ('c-1003', 'WI772MC', 'warsaw_walker', 'sidewalk-blocking', 'Припаркувався повністю на тротуарі, залишивши мамам з візками лише вихід на проїжджу частину.', 'Parked fully on the sidewalk, forcing parents with strollers onto the road.', 'https://placehold.co/640x360?text=sidewalk', 22, 3, '2026-07-05T11:05:00Z'),
  ('c-1004', 'GD1450A', 'coastline', 'illegal-parking', 'Зайняв одразу два паркомісця на переповненому паркінгу біля пляжу.', 'Took up two parking spaces at once in a packed lot near the beach.', null, 9, 1, '2026-07-01T09:30:00Z'),
  ('c-1005', 'GD1450A', 'kamil77', 'illegal-parking', 'Стоянка на місці для людей з інвалідністю без відповідної позначки.', 'Parked in a disabled spot without any permit displayed.', 'https://placehold.co/640x360?text=parking', 6, 2, '2026-06-30T14:12:00Z'),
  ('c-1006', 'PO88231', 'poznaniak', 'dangerous-driving', 'Обгін через суцільну на повороті — ледь не спричинив лобове зіткнення.', 'Overtook across a solid line on a bend — nearly caused a head-on collision.', 'https://placehold.co/640x360?text=dashcam', 18, 1, '2026-07-04T19:48:00Z'),
  ('c-1007', 'DW5T900', 'wroclaw_bike', 'other', 'Викинув недопалок з вікна прямо на велодоріжку.', 'Threw a cigarette butt out of the window right onto the bike lane.', null, 4, 5, '2026-07-06T07:22:00Z'),
  ('c-1008', 'SK4021L', 'silesia_drive', 'dangerous-driving', 'Проїхав на червоне світло на переході, коли пішоходи вже почали рух.', 'Ran a red light at the crossing while pedestrians had already started walking.', null, 13, 2, '2026-07-03T22:10:00Z')
on conflict (id) do update set author = excluded.author, category = excluded.category, text_uk = excluded.text_uk, text_en = excluded.text_en, photo = excluded.photo, upvotes = excluded.upvotes, downvotes = excluded.downvotes;
