-- E-book files are hosted on Cloudinary (or any host) and the link is pasted
-- by the admin — often after the book is already listed in the catalogue.
-- Allow the file URL to be empty until then instead of forcing a dummy link.
ALTER TABLE "Book" ALTER COLUMN "fileUrl" DROP NOT NULL;
