import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { db } from '@/storage/database'
import { moments, momentLikes, momentComments, momentBackgrounds, characters } from '@/storage/database/shared/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

@Injectable()
export class MomentsService {
  async getMoments(novelId?: string, characterId?: string) {
    const conditions = []
    if (novelId) conditions.push(eq(moments.novelId, novelId))
    if (characterId) conditions.push(eq(moments.characterId, characterId))

    const momentsList = await db
      .select({
        id: moments.id,
        characterId: moments.characterId,
        characterName: characters.characterName,
        characterAvatar: characters.avatarKey,
        content: moments.content,
        imageUrl: moments.imageUrl,
        createdAt: moments.createdAt,
        likes: sql<number>`(SELECT COUNT(*) FROM moment_likes WHERE moment_id = ${moments.id})`,
        comments: sql<number>`(SELECT COUNT(*) FROM moment_comments WHERE moment_id = ${moments.id})`,
      })
      .from(moments)
      .leftJoin(characters, eq(moments.characterId, characters.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(moments.createdAt))
      .limit(50)

    return momentsList
  }

  async createMoment(characterId: string, novelId: string, content: string, imageUrl?: string) {
    const [moment] = await db
      .insert(moments)
      .values({
        characterId,
        novelId,
        content,
        imageUrl,
      })
      .returning()

    return moment
  }

  async likeMoment(momentId: string, characterId: string) {
    const existing = await db
      .select()
      .from(momentLikes)
      .where(and(eq(momentLikes.momentId, momentId), eq(momentLikes.characterId, characterId)))

    if (existing.length > 0) {
      await db.delete(momentLikes).where(and(eq(momentLikes.momentId, momentId), eq(momentLikes.characterId, characterId)))
      return { liked: false }
    } else {
      await db.insert(momentLikes).values({ momentId, characterId })
      return { liked: true }
    }
  }

  async commentMoment(momentId: string, characterId: string, content: string) {
    const [comment] = await db
      .insert(momentComments)
      .values({ momentId, characterId, content })
      .returning()

    return comment
  }

  async getComments(momentId: string) {
    const comments = await db
      .select({
        id: momentComments.id,
        characterId: momentComments.characterId,
        characterName: characters.characterName,
        content: momentComments.content,
        createdAt: momentComments.createdAt,
      })
      .from(momentComments)
      .leftJoin(characters, eq(momentComments.characterId, characters.id))
      .where(eq(momentComments.momentId, momentId))
      .orderBy(desc(momentComments.createdAt))

    return comments
  }

  async setBackground(novelId: string, imageUrl: string) {
    const existing = await db
      .select()
      .from(momentBackgrounds)
      .where(eq(momentBackgrounds.novelId, novelId))

    if (existing.length > 0) {
      await db
        .update(momentBackgrounds)
        .set({ imageUrl })
        .where(eq(momentBackgrounds.novelId, novelId))
    } else {
      await db.insert(momentBackgrounds).values({ novelId, imageUrl })
    }

    return { url: imageUrl }
  }

  async getBackground(novelId: string) {
    const background = await db
      .select()
      .from(momentBackgrounds)
      .where(eq(momentBackgrounds.novelId, novelId))

    return background.length > 0 ? background[0] : null
  }
}
