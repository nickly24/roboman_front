# Дизайн-система RoboMan

Основана на **Dashdark X**. Светлая и тёмная темы, фиолетово-синий акцент (#6366f1).

---

## Правила использования

### 1. Цвета — только через переменные

**Запрещено:** жёстко задавать цвета (`#1f2937`, `#6b7280`, `white` и т.п.)

**Использовать переменные:**

| Назначение | Переменная |
|------------|------------|
| Основной текст | `var(--color-text-primary)` |
| Второстепенный текст | `var(--color-text-secondary)` |
| Приглушённый текст | `var(--color-text-muted)` |
| Акцент (кнопки, ссылки) | `var(--color-primary)` |
| Успех | `var(--color-success)` |
| Ошибка | `var(--color-error)` |
| Предупреждение | `var(--color-warning)` |
| Фирменный оранжевый | `var(--color-orange)` |
| Информация | `var(--color-info)` |
| Фон страницы | `var(--color-bg-base)` |
| Фон карточек/поверхностей | `var(--color-bg-surface)` |
| Фон при наведении | `var(--color-bg-hover)` |
| Рамки | `var(--color-border)` |
| Оверлей (модалки) | `var(--color-overlay)` |

**На primary/danger кнопках** текст всегда белый: `#ffffff` или `var(--color-text-inverse)` (в тёмной теме — `#ffffff`).

---

### 2. Типографика

| Элемент | Переменные |
|---------|------------|
| Заголовок страницы | `--font-size-2xl`, `--font-weight-bold`, `--letter-spacing-tight` |
| Подзаголовок | `--font-size-base`, `--color-text-secondary` |
| Основной текст | `--font-size-base`, `--font-weight-normal` |
| Мелкий текст | `--font-size-sm` или `--font-size-xs` |
| Метки (labels) | `--font-weight-medium`, `--font-size-xs` |

Шрифт: **Montserrat** (`var(--font-sans)`).

---

### 3. Отступы и размеры

Базовый шаг: **4px**.

| Переменная | Значение |
|------------|----------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |

Паддинги карточек: `var(--space-card-padding)`, `var(--space-card-header-padding)`.

---

### 4. Скругления

| Переменная | Значение |
|------------|----------|
| `--radius-sm` | 4px |
| `--radius-md` | 6px |
| `--radius-lg` | 8px |
| `--radius-xl` | 12px |

---

### 5. Тени

| Переменная | Использование |
|------------|---------------|
| `--shadow-sm` | Карточки по умолчанию |
| `--shadow-md` | Приподнятые элементы |
| `--shadow-lg` | Модалки, ховеры |
| `--shadow-xl` | Выпадающие меню |
| `--shadow-primary` | Primary-кнопки |

---

### 6. Темы

- **Светлая:** `:root` (по умолчанию)
- **Тёмная:** `html.theme-dark` — класс на `document.documentElement`

Переключение через `ThemeContext`, `useTheme()`.

---

### 7. Glassmorphism (карточки с фоном)

При фоновом изображении (`layout-main-with-bg`):

- **Карточки** — полупрозрачный фон, `backdrop-filter: blur(16px)`
- **Сайдбар** — без эффекта стекла
- Непрозрачность карточек: ~30% (тёмная), ~45% (светлая)

---

### 8. Компоненты

Использовать существующие: `Button`, `Input`, `Select`, `Card`, `Table`, `Modal`, `KPICard`, `Layout`, `Sidebar`.

Стили компонентов подключают переменные дизайн-системы.

---

### 9. Бейджи и статусы

- **Платное / Успех:** `var(--color-success)`, текст в тёмной теме — `var(--color-text-inverse)`
- **Бесплатное / Ошибка:** `var(--color-error)`, текст — `var(--color-text-inverse)`
- **Роль пользователя (Владелец):** `var(--color-orange)`

---

### 10. Адаптивность

- Таблицы: `overflow-x: auto` на `.table-container` для горизонтальной прокрутки
- Flex-контейнеры с контентом фиксированной ширины: `min-width: 0` для корректного overflow
- Breakpoint: `768px` для мобильной версии

---

## Структура файлов

```
frontend/src/design-system/
├── index.css           # Точка входа
├── DESIGN_SYSTEM.md    # Эта документация
└── tokens/
    ├── index.css       # Импорты токенов
    ├── colors.css      # Цвета (светлая тема)
    ├── theme-dark.css  # Тёмная тема + glassmorphism
    ├── typography.css  # Шрифты, размеры
    ├── spacing.css     # Отступы
    ├── radii.css       # Скругления
    └── shadows.css     # Тени
```

---

## Быстрая шпаргалка

```css
/* Новый компонент */
.my-component {
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  font-size: var(--font-size-base);
  box-shadow: var(--shadow-sm);
}
```
