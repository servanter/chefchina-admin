import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{ recipeId: string }>
}

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&q=80'

async function getRecipe(recipeId: string) {
  try {
    return await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        id: true,
        titleEn: true,
        titleZh: true,
        descriptionEn: true,
        descriptionZh: true,
        coverImage: true,
        cookTimeMin: true,
        servings: true,
        difficulty: true,
        author: { select: { name: true, avatar: true } },
        category: { select: { nameEn: true, nameZh: true } },
      },
    })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { recipeId } = await params
  const recipe = await getRecipe(recipeId)

  if (!recipe) {
    return {
      title: 'ChefChina — Recipe not found',
      description: 'This recipe is no longer available.',
    }
  }

  const title = `${recipe.titleEn} · ${recipe.titleZh}`
  const description =
    recipe.descriptionEn ||
    recipe.descriptionZh ||
    'Discover authentic Chinese recipes on ChefChina.'
  const image = recipe.coverImage || FALLBACK_COVER

  return {
    title: `${title} — ChefChina`,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      siteName: 'ChefChina',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { recipeId } = await params
  const recipe = await getRecipe(recipeId)
  if (!recipe) notFound()

  const deepLink = `chefchina://recipe/${recipe.id}`
  const cover = recipe.coverImage || FALLBACK_COVER
  const difficulty = recipe.difficulty?.toLowerCase() ?? null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #FFF5EC 0%, #FFFDF9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: '#FFFFFF',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(232, 93, 38, 0.15)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={recipe.titleEn}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        <div style={{ padding: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: '#FFF0E8',
              color: '#E85D26',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {recipe.category.nameEn} · {recipe.category.nameZh}
          </div>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#1A1A1A',
              lineHeight: 1.2,
              margin: '0 0 4px',
            }}
          >
            {recipe.titleEn}
          </h1>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#555',
              margin: '0 0 16px',
            }}
          >
            {recipe.titleZh}
          </h2>

          <p
            style={{
              fontSize: 14,
              color: '#666',
              lineHeight: 1.6,
              margin: '0 0 20px',
            }}
          >
            {recipe.descriptionEn ??
              recipe.descriptionZh ??
              'Discover authentic Chinese recipes on ChefChina.'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24,
              fontSize: 13,
              color: '#444',
            }}
          >
            <span>⏱ {recipe.cookTimeMin} min</span>
            <span>🍽 {recipe.servings} servings</span>
            {difficulty && <span>🔥 {difficulty}</span>}
          </div>

          <a
            href={deepLink}
            style={{
              display: 'block',
              background: '#E85D26',
              color: '#FFFFFF',
              textAlign: 'center',
              padding: '14px 18px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              marginBottom: 10,
            }}
          >
            Open in ChefChina App
          </a>

          <a
            href="https://chefchina.app"
            style={{
              display: 'block',
              background: '#FFFFFF',
              border: '1px solid #E85D26',
              color: '#E85D26',
              textAlign: 'center',
              padding: '12px 18px',
              borderRadius: 14,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Download the app
          </a>

          <p
            style={{
              marginTop: 18,
              fontSize: 11,
              color: '#999',
              textAlign: 'center',
            }}
          >
            Shared via ChefChina · Scan to cook with us
          </p>
        </div>
      </div>
    </div>
  )
}
