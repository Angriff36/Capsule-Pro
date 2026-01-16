[Vercel](https://vercel.com/)Slash[next-forge](/en)

* [Docs](/en/docs)
* [Source](https://github.com/vercel/next-forge/)

Search...`⌘K`Ask AI

Ask AI

Introduction

[Overview](/docs)[Philosophy](/docs/philosophy)[Structure](/docs/structure)[Updates](/docs/updates)[FAQ](/docs/faq)

Usage

Setup

Apps

Packages

Deployment

Other

Addons

Examples

Migrations

On this page

# Storage

How to store files in your application.

next-forge has a `storage` package that provides a simple wrapper around [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for file storage.

## [Usage](#usage)

### [Server uploads](#server-uploads)

To use the `storage` package using Server Actions, follow the instructions on [Vercel's server action documentation](https://vercel.com/docs/storage/vercel-blob/server-upload#upload-a-file-using-server-actions).

page.tsx

```
import { put } from '@repo/storage';
import { revalidatePath } from 'next/cache';

export async function Form() {
  async function uploadImage(formData: FormData) {
    'use server';
    const imageFile = formData.get('image') as File;
    const blob = await put(imageFile.name, imageFile, {
      access: 'public',
    });
    revalidatePath('/');
    return blob;
  }

  return (
    <form action={uploadImage}>
      <label htmlFor="image">Image</label>
      <input type="file" id="image" name="image" required />
      <button>Upload</button>
    </form>
  );
}
```

If you need to upload files larger than 4.5 MB, consider using client uploads.

### [Client uploads](#client-uploads)

For client side usage, check out the [Vercel's client upload documentation](https://vercel.com/docs/storage/vercel-blob/client-upload).

page.tsx

```
'use client';

import { type PutBlobResult } from '@repo/storage';
import { upload } from '@repo/storage/client';
import { useState, useRef } from 'react';

export default function AvatarUploadPage() {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  return (
    <>
      <h1>Upload Your Avatar</h1>

      <form
        onSubmit={async (event) => {
          event.preventDefault();

          if (!inputFileRef.current?.files) {
            throw new Error('No file selected');
          }

          const file = inputFileRef.current.files[0];

          const newBlob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/avatar/upload',
          });

          setBlob(newBlob);
        }}
      >
        <input name="file" ref={inputFileRef} type="file" required />
        <button type="submit">Upload</button>
      </form>
      {blob && (
        <div>
          Blob url: <a href={blob.url}>{blob.url}</a>
        </div>
      )}
    </>
  );
}
```

### On this page

[Usage](#usage)[Server uploads](#server-uploads)[Client uploads](#client-uploads)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/storage.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)