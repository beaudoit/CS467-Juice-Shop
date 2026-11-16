/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import * as db from '../data/mongodb'

export function updateProductReviews () {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = security.authenticatedUsers.from(req)
    // rejects a request with no valid identity before DB access
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    db.reviewsCollection.update(
      // author must now match callers email from signed token
      // identity now comes from token, not body
      { _id: req.body.id, author: user.data.email },
      { $set: { message: req.body.message } },
      { multi: true }
    ).then(
      (result: { modified: number, original: Array<{ author: any }> }) => {
        // if review doesnt exist OR if review isn't yours
        if (result.modified === 0) {
          return res.status(401).json({ error: 'Not authorized to edit this review' })
        }
        challengeUtils.solveIf(challenges.noSqlReviewsChallenge, () => { return result.modified > 1 })
        challengeUtils.solveIf(challenges.forgedReviewChallenge, () => { return user?.data && result.original[0] && result.original[0].author !== user.data.email && result.modified === 1 })
        res.json(result)
      }, (err: unknown) => {
        res.status(500).json(err)
      })
  }
}
