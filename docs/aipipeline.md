# 🤖 ImagineX — AI Pipeline Documentation

## Overview

ImagineX uses the **ClipDrop Text-to-Image API** (by Stability AI) as its AI backbone. When a user submits a text prompt, the server proxies the request to ClipDrop, receives a raw PNG binary response, converts it to a base64 data URI, and streams it back to the client — all in a single request cycle.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│   User types:  "A whale swimming in a glowing neon ocean"        │
│                        │                                         │
│              Result.jsx: onSubmitHandler                         │
│                        │                                         │
│         AppContext.generateImage(prompt)                         │
│                        │                                         │
│    POST /api/image/generate-image  { prompt }                    │
│             + header: { token: <JWT> }                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER LAYER                               │
│                                                                  │
│  ① userAuth middleware                                           │
│     └─ Verifies JWT → extracts userId → injects into req.body    │
│                                                                  │
│  ② imageController.generateImage()                               │
│     ├─ Fetch user from MongoDB by userId                         │
│     ├─ Validate: user exists AND prompt is not empty             │
│     └─ Check: creditBalance > 0  (else return error)            │
│                                                                  │
│  ③ Build FormData payload                                        │
│     └─ formData.append('prompt', prompt)                         │
│                                                                  │
│  ④ axios.post → ClipDrop API                                    │
│     ├─ URL:  https://clipdrop-api.co/text-to-image/v1           │
│     ├─ Header: x-api-key: <CLIPDROP_API>                        │
│     └─ responseType: 'arraybuffer'  (raw PNG bytes)              │
│                                                                  │
│  ⑤ Convert arraybuffer → Base64                                 │
│     └─ Buffer.from(data, 'binary').toString('base64')            │
│                                                                  │
│  ⑥ Build data URI                                               │
│     └─ `data:image/png;base64,${base64Image}`                   │
│                                                                  │
│  ⑦ Deduct 1 credit                                              │
│     └─ userModel.findByIdAndUpdate(userId, { creditBalance: n-1})│
│                                                                  │
│  ⑧ Return JSON response                                         │
│     └─ { success, resultImage, creditBalance, message }          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (RESULT PAGE)                         │
│                                                                  │
│  AppContext receives resultImage                                  │
│     └─ Updates credit display in Navbar                          │
│                                                                  │
│  Result.jsx                                                      │
│     ├─ setImage(resultImage)    → renders <img src={resultImage}>│
│     ├─ setIsImageLoading(true)  → shows Download + Generate More │
│     └─ Download button: <a href={resultImage} download>          │
└─────────────────────────────────────────────────────────────────┘
```

---

## ClipDrop API Integration

### Endpoint
```
POST https://clipdrop-api.co/text-to-image/v1
```

### Request Format
The request uses **multipart/form-data** (not JSON), which is why `form-data` is used on the server:

```js
const formData = new FormData();
formData.append('prompt', prompt);

const { data } = await axios.post(
  'https://clipdrop-api.co/text-to-image/v1',
  formData,
  {
    headers: { 'x-api-key': process.env.CLIPDROP_API },
    responseType: 'arraybuffer',   // ← critical: raw binary PNG
  }
);
```

### Why `arraybuffer`?
ClipDrop returns a **raw PNG binary**, not a JSON object. Using `responseType: 'arraybuffer'` tells Axios to collect the response as a Buffer instead of trying to parse it as a string. This binary is then converted:

```js
const base64Image = Buffer.from(data, 'binary').toString('base64');
const resultImage = `data:image/png;base64,${base64Image}`;
```

This produces a self-contained **data URI** that the browser can render as an `<img>` tag without any additional network request.

---

## Credit Guard Logic

Before any API call is made to ClipDrop, the controller enforces the credit check:

```
creditBalance === 0  →  return { success: false, message: "Insufficient credits..." }
creditBalance < 0   →  same guard (belt-and-suspenders)
creditBalance > 0   →  proceed with generation
```

Credits are deducted **after** a successful image generation, so a failed ClipDrop call does not consume credits.

---

## Frontend State Machine — Result Page

```
                 ┌──────────────────────┐
                 │  Initial State        │
                 │  image: assets.future │ ◄── default placeholder image
                 │  isImageLoading: false│
                 │  loading: false       │
                 └──────────┬───────────┘
                            │ user submits prompt
                            ▼
                 ┌──────────────────────┐
                 │  Loading State        │
                 │  loading: true        │ ◄── progress bar animates
                 │  "Loading...." shown  │     (CSS transition 10s)
                 └──────────┬───────────┘
                            │ API returns resultImage
                            ▼
                 ┌──────────────────────┐
                 │  Result State         │
                 │  image: <data URI>    │ ◄── generated image rendered
                 │  isImageLoading: true │
                 │  loading: false       │
                 └──────────┬───────────┘
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
  [Generate Another]               [Download Button]
  setIsImageLoading(false)         <a href={image} download>
  → back to Input State            → browser saves PNG
```

---

## Image Output Specifications

| Property | Value |
|----------|-------|
| Format | PNG |
| Encoding | Base64 data URI |
| Provider | ClipDrop (Stability AI) |
| Transfer | Server-proxied (API key never exposed to client) |
| Storage | None — images are ephemeral (not saved to DB or disk) |
| Download | Available via HTML anchor `download` attribute |

---

## Error Handling in the Pipeline

| Stage | Error | Handling |
|-------|-------|----------|
| Auth | Invalid/missing JWT | Middleware rejects, 401-style response |
| DB Lookup | User not found | Returns `{ success: false, message: "User not found..." }` |
| Credit Check | Balance ≤ 0 | Returns error + `creditBalance` field, client redirects to `/buy` |
| ClipDrop API | Network/API error | Caught in `catch` block, error message forwarded |
| Client | Zero credits detected | `AppContext` auto-navigates to `/buy` |

---

## Security Notes

- The ClipDrop API key (`CLIPDROP_API`) is **only stored on the server** in environment variables — never exposed to the browser.
- All image generation routes are protected by `userAuth` middleware — unauthenticated users cannot generate images.
- Server acts as a secure proxy between the client and ClipDrop, keeping the third-party API key private at all times.

---

## Future Enhancements

- [ ] Add prompt history stored in MongoDB per user
- [ ] Support image style parameters (resolution, style presets)
- [ ] Switch to streaming response for real-time generation progress
- [ ] Add negative prompt support
- [ ] Implement image gallery / saved images per user account
- [ ] Rate limiting per user to prevent API abuse
