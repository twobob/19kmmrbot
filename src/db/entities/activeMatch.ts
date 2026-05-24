import { Entity, Column, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("active_matches")
export class ActiveMatch {
  @PrimaryColumn()
  cacheKey!: string;

  @Column("longtext")
  cacheValue!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
