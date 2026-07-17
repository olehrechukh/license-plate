// UI translations and app config, served statically from the bundle rather than
// the database. These are developer-authored and change only when we ship, so
// they don't belong in Supabase — keeping them here means instant render (no
// network gate), atomic shipping with the code that reads them, and no drift.
//
// Each language doc is one object mirrored key-for-key across languages. `s(path)`
// in useI18n walks these by dotted path.

export const strings = {
  uk: {"site":{"name":"АвтоКарма","tagline":"Оцінюй водіїв за номерним знаком"},"nav":{"provinces":"Області","comments":"Коментарі","rankings":"Рейтинг","addComment":"Додати коментар","terms":"Правила","login":"Увійти"},"home":{"heroTitle":"Перевір водія за номерним знаком","heroSubtitle":"Читай і залишай коментарі про поведінку водіїв на дорозі. Разом робимо дороги безпечнішими.","searchLabel":"Номерний знак","searchPlaceholder":"Наприклад, BC9563H","searchButton":"Шукати","selectedCommentsTitle":"Обрані коментарі","currentRankingTitle":"Рейтинг цього місяця","viewAll":"Переглянути всі"},"provinces":{"title":"Області","intro":"Обери область, щоб переглянути коментарі про водіїв у цьому регіоні.","commentsCountLabel":"коментарів"},"comments":{"title":"Усі коментарі","sortNewest":"Найновіші","sortTopVoted":"Найпопулярніші","empty":"Коментарів поки немає.","loadMore":"Показати більше"},"rankings":{"title":"Рейтинг","subtitle":"Найгірші водії за поточний місяць за оцінками користувачів.","colRank":"Місце","colPlate":"Номер","colRegion":"Регіон","colScore":"Оцінка","colComments":"Коментарі","period":"Період"},"plateDetail":{"commentsForPlate":"Коментарі до номера","noComments":"Для цього номера ще немає коментарів.","addCommentCta":"Додати коментар про цей номер","scoreLabel":"Оцінка","reportedTimes":"Скарг цього місяця: {count}"},"newComment":{"title":"Додати коментар","intro":"Опиши ситуацію на дорозі. Будь ласка, дотримуйся фактів і не використовуй образливих висловів.","fields":{"plate":{"label":"Номерний знак","placeholder":"Наприклад, BC9563H","help":"Введи номер без пробілів.","invalidFormat":"Використовуй лише літери й цифри (3–10 символів).","invalidRegion":"Введи дійсний український регіональний номер."},"category":{"label":"Категорія порушення","options":{"dangerous-driving":"Небезпечна їзда","illegal-parking":"Неправильне паркування","sidewalk-blocking":"Блокування тротуару","lane-misuse":"Неправильне використання смуги","aggression":"Агресія на дорозі","other":"Інше"}},"description":{"label":"Опис","placeholder":"Опиши, що сталося…","help":"Мінімум 20 символів."},"photo":{"label":"Фото або відео","help":"Необов'язково. Можна додати кадр з реєстратора."},"author":{"label":"Ім'я або нік","placeholder":"Як тебе підписати"}},"submit":"Опублікувати","submitFailed":"Не вдалося опублікувати коментар. Спробуйте ще раз.","consentText":"Публікуючи коментар, я підтверджую, що дотримуюсь правил сайту.","successMessage":"Дякуємо! Твій коментар додано.","authRequired":"Щоб додати коментар, спершу увійдіть у свій акаунт."},"categories":{"dangerous-driving":"Небезпечна їзда","illegal-parking":"Неправильне паркування","sidewalk-blocking":"Блокування тротуару","lane-misuse":"Неправильне використання смуги","aggression":"Агресія на дорозі","other":"Інше"},"terms":{"title":"Правила","body":"Коментарі мають стосуватися поведінки на дорозі. Заборонено образи, персональні дані, наклеп і мову ворожнечі. Адміністрація може видаляти контент, що порушує ці правила."},"contact":{"title":"Контакти","email":"kontakt@example.com","body":"Маєш питання чи скаргу на контент? Напиши нам на електронну пошту."},"login":{"title":"Вхід","usernameLabel":"Логін","passwordLabel":"Пароль","submit":"Увійти","registerLink":"Немає акаунту? Зареєструватися"},"vote":{"label":"Оцінити коментар","up":"Підтримати","down":"Не погоджуюсь"},"footer":{"copyright":"© 2026 АвтоКарма. Усі права захищено.","contactLink":"Контакти","tagline":"Створено для безпечніших доріг."},"langSwitch":{"uk":"Українська","en":"Англійська","label":"Мова"},"auth":{"googleSignIn":"Увійти через Google","signOut":"Вийти","signingIn":"Переадресація…","signInFailed":"Не вдалося увійти через Google. Спробуйте ще раз."}},
  en: {"site":{"name":"AutoKarma","tagline":"Rate drivers by their license plate"},"nav":{"provinces":"Provinces","comments":"Comments","rankings":"Driver rankings","addComment":"Add comment","terms":"Terms","login":"Log in"},"home":{"heroTitle":"Check a driver by license plate","heroSubtitle":"Read and leave comments about driver behavior on the road. Together we make roads safer.","searchLabel":"License plate","searchPlaceholder":"e.g. BC9563H","searchButton":"Search","selectedCommentsTitle":"Selected comments","currentRankingTitle":"This month's ranking","viewAll":"View all"},"provinces":{"title":"Provinces","intro":"Pick a province to browse comments about drivers in that region.","commentsCountLabel":"comments"},"comments":{"title":"All comments","sortNewest":"Newest","sortTopVoted":"Top voted","empty":"No comments yet.","loadMore":"Load more"},"rankings":{"title":"Driver rankings","subtitle":"The worst drivers this month according to user ratings.","colRank":"Rank","colPlate":"Plate","colRegion":"Region","colScore":"Score","colComments":"Comments","period":"Period"},"plateDetail":{"commentsForPlate":"Comments for plate","noComments":"There are no comments for this plate yet.","addCommentCta":"Add a comment about this plate","scoreLabel":"Score","reportedTimes":"Reports this month: {count}"},"newComment":{"title":"Add comment","intro":"Describe the situation on the road. Please stick to the facts and avoid offensive language.","fields":{"plate":{"label":"License plate","placeholder":"e.g. BC9563H","help":"Enter the plate without spaces.","invalidFormat":"Use only letters and numbers (3–10 characters).","invalidRegion":"Enter a valid Ukrainian regional plate."},"category":{"label":"Violation category","options":{"dangerous-driving":"Dangerous driving","illegal-parking":"Illegal parking","sidewalk-blocking":"Sidewalk blocking","lane-misuse":"Lane misuse","aggression":"Road aggression","other":"Other"}},"description":{"label":"Description","placeholder":"Describe what happened…","help":"At least 20 characters."},"photo":{"label":"Photo or video","help":"Optional. You can attach a dashcam frame."},"author":{"label":"Name or nickname","placeholder":"How to sign your comment"}},"submit":"Publish","submitFailed":"We could not publish your comment. Please try again.","consentText":"By posting a comment, I confirm that I follow the site rules.","successMessage":"Thank you! Your comment has been added.","authRequired":"Please sign in to add a comment."},"categories":{"dangerous-driving":"Dangerous driving","illegal-parking":"Illegal parking","sidewalk-blocking":"Sidewalk blocking","lane-misuse":"Lane misuse","aggression":"Road aggression","other":"Other"},"terms":{"title":"Terms","body":"Comments must relate to road behavior. Insults, personal data, defamation, and hate speech are prohibited. Administrators may remove content that violates these rules."},"contact":{"title":"Contact","email":"kontakt@example.com","body":"Have a question or a complaint about content? Email us."},"login":{"title":"Log in","usernameLabel":"Username","passwordLabel":"Password","submit":"Log in","registerLink":"No account? Sign up"},"vote":{"label":"Rate comment","up":"Upvote","down":"Downvote"},"footer":{"copyright":"© 2026 AutoKarma. All rights reserved.","contactLink":"Contact","tagline":"Built for safer roads."},"langSwitch":{"uk":"Ukrainian","en":"English","label":"Language"},"auth":{"googleSignIn":"Sign in with Google","signOut":"Sign out","signingIn":"Redirecting…","signInFailed":"Could not sign in with Google. Please try again."}}
}

strings.uk.comments.importedFrom = 'Імпортовано з'
strings.en.comments.importedFrom = 'Imported from'
strings.uk.newComment.fields.sourceUrl = {
  label: 'Посилання на джерело',
  placeholder: 'https://facebook.com/…',
  help: 'Необов’язково. Доступно лише адміністраторам.',
  invalid: 'Введіть повне посилання, що починається з http:// або https://.'
}
strings.en.newComment.fields.sourceUrl = {
  label: 'Source link',
  placeholder: 'https://facebook.com/…',
  help: 'Optional. Available to admins only.',
  invalid: 'Enter a complete link beginning with http:// or https://.'
}
strings.uk.comments.delete = 'Видалити'
strings.uk.comments.deleting = 'Видалення…'
strings.uk.comments.deleteConfirm = 'Видалити цей коментар? Він буде прихований, але збережений у базі даних.'
strings.uk.comments.deleteFailed = 'Не вдалося видалити коментар. Спробуйте ще раз.'
strings.en.comments.delete = 'Delete'
strings.en.comments.deleting = 'Deleting…'
strings.en.comments.deleteConfirm = 'Remove this comment? It will be hidden but retained in the database.'
strings.en.comments.deleteFailed = 'Could not remove the comment. Please try again.'
strings.uk.newComment.fields.photo.help = 'Необов’язково. Можна додати одне фото або кадр з реєстратора.'
strings.en.newComment.fields.photo.help = 'Optional. You can attach one photo or dashcam frame.'

// The leaderboard period is derived at runtime so it cannot become stale after a deploy.
export function currentRankingPeriod(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
export const config = {
  defaultLang: 'uk',
  languages: ['uk', 'en'],
  rankingPeriod: currentRankingPeriod()
}
