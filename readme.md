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

### Редактирование карточки медиа
в карточке дела пользователь нажимает "редактировать", открывается окно с заполненными данными. постер можно задать одним из двух способов:
- заменить ссылку на постер в поле "ссылка на постер";
- загрузить свой файл изображения кнопкой "загрузить свой постер", при этом загруженный постер имеет приоритет над ссылкой и его можно удалить.
кнопка "сохранить" сохраняет изменения.

### Реестр Дел
в реестре дел в верху отображается поиск и кнопка "поиск" и иконка фильтров: год, жанры, тип, мой-статус, статус загрузки (скачать/скачано/не установлено), информатор

## Безопасность
Авторизация обязательна - любое действие только через авторизацию

## Архитектура
приложение будет развернуто в докере на личном сервере truenas, данные хранятся в pg в отдельном контейнере

## Развертывание
Стек поднимается через Docker Compose и состоит из трех сервисов:
- `db` — PostgreSQL 16, данные в volume `pgdata`;
- `backend` — Django + gunicorn, миграции и `collectstatic` выполняются при старте;
- `frontend` — nginx с собранным SPA, отдает статику и проксирует `/api`, `/admin`, `/static`, `/media` на backend.

Публикуется только frontend: `127.0.0.1:${HTTP_PORT}` (по умолчанию `8080`). Перед стеком ставится внешний nginx хоста, который терминирует TLS и проксирует трафик на этот порт.

### Требования
- Docker и Docker Compose v2;
- внешний nginx на хосте и домен/поддомен для TLS.

### 1. Получить код
```sh
git clone <repo-url> OKID
cd OKID
```

### 2. Настроить окружение
Создать `.env` из примера и заполнить значения:
```sh
cp .env.example .env
```
Обязательные переменные:
- `DJANGO_SECRET_KEY` — сгенерировать: `python -c "import secrets; print(secrets.token_urlsafe(64))"`;
- `ALLOWED_HOSTS` — публичный домен (например `okid.example.com`);
- `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` — публичный URL с схемой (`https://okid.example.com`);
- `POSTGRES_PASSWORD` — пароль к БД;
- `POISKKINO_API_KEY`, `SHIKIMORI_APP_NAME` — ключи внешних API;
- `HTTP_PORT` — локальный порт публикации, не должен пересекаться с 80/443 основного nginx;
- `DJANGO_HTTPS=True` — при работе по HTTPS включает secure-cookies, HSTS и редирект на HTTPS.

### 3. Собрать и запустить
```sh
docker compose up -d --build
```
Миграции и сбор статики выполняются автоматически при старте backend (`backend/docker-entrypoint.sh`). Проверить состояние и логи:
```sh
docker compose ps
docker compose logs -f backend
```

### 4. Создать администратора
```sh
docker compose exec backend python manage.py createsuperuser
```

### 5. Настроить внешний nginx и TLS
Взять конфиг `docker/nginx.conf`, заменить `okid.example.com` и пути к сертификатам на свои, положить в `/etc/nginx/sites-enabled/okid.conf` (или `/etc/nginx/conf.d/okid.conf`) и применить:
```sh
nginx -t && systemctl reload nginx
```
Для выпуска сертификата удобно использовать certbot в режиме webroot: в конфиге уже есть `location /.well-known/acme-challenge/`.
```sh
certbot certonly --webroot -w /var/www/html -d okid.example.com
```

### Обновление
```sh
git pull
docker compose up -d --build
```

## Лицензия
[MIT](LICENSE)

