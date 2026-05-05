# Техническое задание: CRM OrientLogistik

## 1. Структура базы данных (Schema)

### Таблица `profiles` (Пользователи)
- `id`: uuid (PK)
- `email`: string
- `role`: enum ('client', 'buyer')
- `full_name`: string

### Таблица `orders` (Заявки)
- `id`: uuid (PK)
- `created_at`: timestamp
- `client_id`: uuid (FK -> profiles)
- `status`: enum ('draft', 'on_review', 'calculating', 'pending_payment', 'purchased', 'at_warehouse', 'shipped', 'delivered')
- `exchange_rate`: decimal (Курс юаня к рублю на момент фиксации)
- `delivery_cost_rmb`: decimal (Стоимость доставки, вводит байер)
- `total_amount_rmb`: decimal (Сумма за товары + доставка)
- `total_amount_rub`: decimal (Итого в рублях)
- `notes`: text

### Таблица `order_items` (Товары в заявке)
- `id`: uuid (PK)
- `order_id`: uuid (FK -> orders)
- `name_ru`: string (Название товара)
- `name_ch`: string (Название на китайском)
- `photo_url`: string (Ссылка на фото в Storage)
- `description`: text (Техническое описание)
- `material`: string (Материал)
- `has_battery`: boolean (Наличие аккумулятора)
- `dimensions`: string (Размер товара)
- `link`: string (Ссылка на товар)
- `hs_code`: string (ТН ВЭД)
- `manufacturer`: string (Производитель)
- `model`: string (Модель)
- `sku`: string (Артикул)
- `brand`: string (Бренд)
- `qty_per_box`: integer (Кол-во в коробке)
- `box_count`: integer (Кол-во коробок)
- `total_qty`: integer (Общее кол-во)
- `box_dimensions`: string (Размер коробки)
- `net_weight_per_unit`: decimal (Вес нетто ед.)
- `weight_per_box_kg`: decimal (Вес коробки)
- `total_net_weight_kg`: decimal (Общий вес нетто)
- `total_gross_weight_kg`: decimal (Общий вес брутто)
- `total_volume_m3`: decimal (Общий объем)
- `price_per_unit_rmb`: decimal (Цена за ед.)
- `total_price_rmb`: decimal (Цена общая)

## 2. Логика статусов

1. **Draft (Черновик)**: Создается клиентом. Можно редактировать товары.
2. **On Review (На проверке)**: Клиент отправил байеру. Редактирование для клиента закрыто.
3. **Calculating (Расчет)**: Байер вносит веса, объемы и `delivery_cost_rmb`.
4. **Pending Payment (Ожидает оплаты)**: Финальная сумма в RUB посчитана. Клиент видит итого.
5. **Purchased (Выкуплено)**: Байер подтвердил выкуп.
6. **At Warehouse (На складе)**: Товар поступил на склад в Китае.
7. **Shipped (Отправлено)**: Груз выехал в РФ.
8. **Delivered (Доставлено)**: Заказ завершен.

## 3. Описание интерфейсов (UI Screens)

### Экран 1: Дашборд (Общий)
- Карточки со статистикой: "Активные заказы", "Ожидают оплаты", "В пути".
- Таблица последних заказов с цветовой индикацией статусов.

### Экран 2: Создание/Редактирование заказа (Заказчик)
- Форма добавления товара (поля из Excel).
- Загрузка изображений (Drag-and-drop).
- Список добавленных товаров в текущем заказе.
- Кнопка "Отправить байеру на расчет".

### Экран 3: Расчет заказа (Байер)
- Просмотр всех данных, внесенных заказчиком.
- Поля для ввода: 
    - Реальный вес/объем каждой позиции.
    - Стоимость логистики внутри Китая (опционально).
    - **Стоимость доставки до РФ (RMB)** - ключевое поле.
- Кнопка "Завершить расчет".

### Экран 4: Финальное подтверждение (Заказчик)
- Детальный расчет: Сумма товаров + Доставка.
- Поле "Курс RMB" (автоматическое из API или ручное).
- Итоговая сумма в RUB.
- Кнопка "Оплачено".
