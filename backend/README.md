# SC Library Backend

This is the Express API for the SC Library catalog. It is packaged as a Cloud Run service and uses the Firebase Admin SDK for server-side Auth and Firestore access.

## Local development

```powershell
npm install
npm run dev
```

The service listens on `http://localhost:8080` by default. Copy `.env.example` to `.env` when using the Firebase emulators.

## Deploy to Cloud Run

Prerequisites:

- Google Cloud CLI installed
- `gcloud auth login` completed
- Billing enabled for the Google Cloud project
- Cloud Run, Cloud Build, and Artifact Registry APIs enabled

From this directory:

```powershell
npm run deploy
```

The script defaults to the existing Firebase project, `south-church-library`, and the `sc-library-api` service. Override the project or service with parameters or environment variables:

```powershell
.\deploy.ps1 -Project my-project -Service my-api
```

The Cloud Run service account must have access to the Firebase resources it uses. Grant only the roles required by the API, such as ` roles/datastore.user` for Firestore access. Do not deploy a service-account key file; Firebase Admin uses Cloud Run Application Default Credentials.
