package com.Board.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.Board.dto.BoardDto;

@Mapper
public interface DateMapper {

    String selectDate();
   
}
