# ОКИД — «Отдел кинодел и досье»
Моя личная фильмотерка, в ней я создаю заметки по разным типам медиа:
- фильмы
- сериалы 
- аниме

Учитываются такие состояния как:
- просмотренно
- планирую
- брошено
- смотрю

флаг про добавление в личный медиа-архив:
- нет
- скачать
- скачано

А так же рекомендации: на карточке медиа можно сделать заметки кто порекомендовал.

Добавление карточки медиа:
- в ручную созданием и загрузкой
- [ПоискКино](https://poiskkino.dev/documentation) - для фильмов/сериалов
- [shikimori](https://shikimori.io/api/doc) - для аниме

Пример ответа данных с "ПоискКино":

```js
{
  "id": 666,
  "externalId": {
    "kpHD": "48e8d0acb0f62d8585101798eaeceec5",
    "imdb": "tt0232500",
    "tmdb": 9799
  },
  "name": "Человек паук",
  "alternativeName": "Spider man",
  "enName": "Spider man",
  "names": [
    {
      "name": "string",
      "language": null,
      "type": null
    }
  ],
  "type": "movie",
  "typeNumber": 1,
  "year": 2023,
  "description": null,
  "shortDescription": null,
  "slogan": null,
  "status": "completed",
  "facts": [
    {
      "value": "string",
      "type": null,
      "spoiler": null
    }
  ],
  "rating": {
    "kp": 6.2,
    "imdb": 8.4,
    "tmdb": 3.2,
    "filmCritics": 10,
    "russianFilmCritics": 5.1,
    "await": 6.1
  },
  "votes": {
    "kp": 60000,
    "imdb": 50000,
    "tmdb": 10000,
    "filmCritics": 10000,
    "russianFilmCritics": 4000,
    "await": 34000
  },
  "movieLength": 120,
  "ratingMpaa": "pg13",
  "ageRating": "16",
  "logo": {
    "url": null
  },
  "poster": {
    "url": null,
    "previewUrl": null
  },
  "backdrop": {
    "url": null,
    "previewUrl": null
  },
  "videos": {
    "trailers": [
      {
        "url": "https://www.youtube.com/embed/ZsJz2TJAPjw",
        "name": "Official Trailer",
        "site": "youtube",
        "size": null,
        "type": "TRAILER"
      }
    ]
  },
  "genres": [
    {
      "name": "комедия",
      "id": 6,
      "slug": "comedy"
    }
  ],
  "countries": [
    {
      "name": "США",
      "id": 1
    }
  ],
  "persons": [
    {
      "id": 6317,
      "photo": "https://st.kp.yandex.net/images/actor_iphone/iphone360_6317.jpg",
      "name": "Пол Уокер",
      "enName": "Paul Walker",
      "description": null,
      "profession": "актеры",
      "enProfession": "actor",
      "professionId": 1
    }
  ],
  "reviewInfo": {
    "count": null,
    "positiveCount": null,
    "percentage": null
  },
  "seasonsInfo": [
    {
      "number": null,
      "episodesCount": null
    }
  ],
  "budget": {
    "value": 207283,
    "currency": "€"
  },
  "fees": {
    "world": {
      "value": 207283,
      "currency": "€"
    },
    "russia": {
      "value": 207283,
      "currency": "€"
    },
    "usa": {
      "value": 207283,
      "currency": "€"
    }
  },
  "premiere": {
    "country": "США",
    "world": "2023-02-25T02:44:39.359Z",
    "russia": "2023-02-25T02:44:39.359Z",
    "digital": null,
    "cinema": "2023-02-25T02:44:39.359Z",
    "bluray": null,
    "dvd": null
  },
  "similarMovies": [
    {
      "id": 1,
      "name": null,
      "enName": null,
      "alternativeName": null,
      "type": null,
      "poster": {
        "url": null,
        "previewUrl": null
      },
      "rating": {
        "kp": 6.2,
        "imdb": 8.4,
        "tmdb": 3.2,
        "filmCritics": 10,
        "russianFilmCritics": 5.1,
        "await": 6.1
      },
      "year": 2030
    }
  ],
  "sequelsAndPrequels": [
    {
      "id": 1,
      "name": null,
      "enName": null,
      "alternativeName": null,
      "type": null,
      "poster": {
        "url": null,
        "previewUrl": null
      },
      "rating": {
        "kp": 6.2,
        "imdb": 8.4,
        "tmdb": 3.2,
        "filmCritics": 10,
        "russianFilmCritics": 5.1,
        "await": 6.1
      },
      "year": 2030
    }
  ],
  "watchability": {
    "items": [
      {
        "name": null,
        "logo": {
          "url": null
        },
        "url": "string"
      }
    ]
  },
  "releaseYears": [
    {
      "start": 2022,
      "end": 2023
    }
  ],
  "top10": 1,
  "top250": 200,
  "ticketsOnSale": true,
  "totalSeriesLength": 155,
  "seriesLength": 20,
  "isSeries": true,
  "audience": [
    {
      "count": 1000,
      "country": "Россия"
    }
  ],
  "lists": [
    "250 лучших сериалов"
  ],
  "networks": {
    "items": [
      {
        "name": "Netflix",
        "logo": {
          "url": null
        }
      }
    ]
  },
  "updatedAt": null,
  "createdAt": null
}
```


## Отображаемые данные:
### Карточка медиа
На карточке медиа отображаем
- Отображаемое Название
- Оригинальное Название
- год начала выхода
- год завершение выхода
- url ссылка на постер 
- описание
- список жанров
- мой-статус(планирую/смотрю/бросил/просмотрено) 
- статус загрузки (скачано/нужно скачать/null)
- дата время добавления
- рейтинги загруженные с ПоискКино
- мой рейтинг

Вкладки:
- История обращений:
    - дата время
    - новый статус
- Информаторы:
    - дата время
    - кто порекомендовал
- Связанное - коллекции в которые добавили данное медиа
### Реестр дел
Постер, название, год, личный рейтинг, мой-статус(планирую/смотрю/бросил/просмотрено) в виде иконки, статус загрузки (скачано/нужно скачать)

## Бизнес процессы пользователя
### Создание карточки медиа
В реестре дел пользователь нажимает "создать дело", открывается окно с ручным заполнением данных. пока без возможности загрузить свой постер. кнопка "сохранить" назвается "сдать в архив" 
в реестре дел пользователь нажимает "поиск во внешних архивах", открывается окно ввода названия, выбора типа(сериал, фильм, аниме) и год выхода. нажимает "поиск", результаты поиска отображаются списком ниже, пользователь выбирает какое "дело" его интересует и нажимает "загрузить", создается карточка "дело" с выбранным инфо медиа

### Реестр Дел
в реестре дел в верху отображается поиск и кнопка "поиск" и иконка фильтров: год, жанры, тип, мой-статус, статус загрузки (скачать/скачано/не установлено), информатор

## Безопасность
Авторизация обязательна - любое действие только через авторизацию

## Архитектура
приложение будет развернуто в докере на личном сервере truenas, данные хранятся в pg в отдельном контейнере

## Лицензия
[MIT](LICENSE)

