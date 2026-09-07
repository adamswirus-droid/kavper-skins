# KavperSkins — stały link w 5 krokach (za darmo, ~10 minut)

Potrzebujesz tylko **jednego konta: Vercel** (baza danych dodaje się w jego panelu).
Wszystko w przeglądarce, żadnego terminala.

---

### 1. Pobierz projekt
W tym edytorze: **Download / Export project** → rozpakuj folder na komputerze.

### 2. Wrzuć na GitHub (przeglądarka, bez instalowania niczego)
1. https://github.com/signup → załóż konto (jeśli nie masz)
2. https://github.com/new → nazwa `kavper-skins` → **Create repository**
3. Na stronie repo kliknij **„uploading an existing file"**
4. **Przeciągnij całą zawartość folderu projektu** do przeglądarki
   (WSZYSTKO oprócz folderów `node_modules` i `.next`, jeśli są)
5. Na dole kliknij **Commit changes** i poczekaj, aż się wgra

### 3. Załóż Vercel i wdroż
1. https://vercel.com/signup → **Continue with GitHub**
2. **Add New… → Project** → przy `kavper-skins` kliknij **Import**
3. Nic nie zmieniaj → **Deploy** → poczekaj ~2 min (pojawi się błąd bazy — to normalne, robimy dalej)

### 4. Dodaj bazę danych (1 klik)
1. W projekcie na Vercel → zakładka **Storage** → **Create Database**
2. Wybierz **Neon (Postgres)** → **Continue** → plan **Free** → region **Frankfurt** → **Create**
3. **Connect Project** → zaznacz `kavper-skins` → **Connect**
   (Vercel sam wpisze `DATABASE_URL` do projektu)
4. Zakładka **Deployments** → przy ostatnim kliknij **⋯ → Redeploy** → **Redeploy**

### 5. Utwórz tabele i graj
Otwórz w przeglądarce (podmień na swój adres z Vercel):

```
https://kavper-skins.vercel.app/api/setup
```

Zobaczysz `{"ok":true,"message":"Baza gotowa. Możesz grać!"}` — **gotowe**.
Twój stały link: **https://kavper-skins.vercel.app** (działa 24/7, wyślij znajomym).

---

### Później
- **Zmiany w grze:** wgraj nowe pliki na GitHub (ten sam sposób) → Vercel sam przebuduje.
- **Własna domena:** Vercel → Settings → Domains.
- **Baza po przerwie „budzi się" 2–3 s** (plan Free) — normalne.
- **Błąd „DATABASE_URL is required"** → nie zrobiłeś kroku 4.3 lub 4.4.
